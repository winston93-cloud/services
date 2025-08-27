'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaBell, FaCheck, FaCircle } from 'react-icons/fa'
import { Notificacion, getUnreadNotificationsCount, listNotifications, markNotificationAsRead } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function NotificationsBell() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [items, setItems] = useState<Notificacion[]>([])
  const [selected, setSelected] = useState<Notificacion | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const [showAllModal, setShowAllModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const alumnoRef = user?.alumno_ref

  const formatDateTime = (value?: string | null) => {
    if (!value) return ''
    const d = new Date(value as string)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  }

  // Montado para usar portal del modal
  useEffect(() => { setMounted(true) }, [])

  // Logs de diagnóstico
  useEffect(() => {
    console.log('[Bell] mounted:', mounted, 'alumnoRef:', alumnoRef)
  }, [mounted, alumnoRef])

  useEffect(() => {
    console.log('[Bell] isOpen changed ->', isOpen, 'items:', items?.length)
  }, [isOpen, items])

  useEffect(() => {
    console.log('[Bell] selected changed ->', selected?.id)
  }, [selected])

  useEffect(() => {
    console.log('[Bell] showModal changed ->', showModal)
  }, [showModal])

  useEffect(() => {
    console.log('[Bell] showAllModal changed ->', showAllModal)
  }, [showAllModal])

  async function loadCount() {
    if (!alumnoRef) return
    const res = await getUnreadNotificationsCount(alumnoRef)
    if (res.success) setCount(res.count || 0)
  }

  async function loadList() {
    if (!alumnoRef) return
    setIsLoading(true)
    const res = await listNotifications(alumnoRef)
    if (res.success && res.data) setItems(res.data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (alumnoRef) {
      loadCount()
    }
  }, [alumnoRef])

  useEffect(() => {
    if (isOpen && alumnoRef) {
      loadList()
    }
  }, [isOpen, alumnoRef])

  // No mostrar campana si no hay usuario autenticado (pantalla de login)
  if (!alumnoRef) {
    return null
  }

  const unreadItems = items.filter(n => n.estatus === 1)
  const unread = unreadItems.length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => { 
          console.log('[Bell] toggle click'); 
          if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 416) }) // 416px ≈ 26rem
          }
          setIsOpen(o => !o) 
        }}
        className="group relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/20 backdrop-blur border border-white/30 shadow-md hover:shadow-lg hover:bg-white/30 transition-all duration-200 flex items-center justify-center"
        title="Notificaciones"
      >
        <FaBell className={`text-white text-lg sm:text-xl transition-transform ${unread > 0 || (count ?? 0) > 0 ? 'animate-bounce' : ''}`} />
        {(count ?? unread) > 0 && (
          <>
            <span className="absolute -top-1 -right-1 h-5 min-w-[18px] px-1.5 flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-extrabold rounded-full ring-2 ring-white/70 shadow-md">
              {count ?? unread}
            </span>
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500/60 animate-ping" />
          </>
        )}
        <span className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-white/40 transition" />
      </button>

      {mounted && isOpen && dropdownPos && createPortal(
        (
          <>
            <div className="fixed inset-0 z-[1000]" onClick={() => setIsOpen(false)} />
            <div 
              className="fixed w-[26rem] bg-white/98 backdrop-blur border border-gray-200 rounded-2xl shadow-2xl z-[1001]"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className="absolute -top-2 right-6 w-3 h-3 rotate-45 bg-white border-t border-l border-gray-200" />
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-900">Notificaciones</span>
                <span className="text-xs text-gray-500">{unread} sin leer</span>
              </div>
              <div className="max-h-[26rem] overflow-auto">
                {isLoading ? (
                  <div className="p-5 text-sm text-gray-500">Cargando...</div>
                ) : unreadItems.length === 0 ? (
                  <div className="p-5 text-sm text-gray-500">No hay notificaciones</div>
                ) : (
                  unreadItems.map(n => (
                    <button
                      key={n.id}
                      onMouseDown={(e) => { e.stopPropagation(); console.log('[Bell] mousedown id=', n.id); setSelected(n); setShowModal(true); setIsOpen(false) }}
                      className={`w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${n.estatus === 1 ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="mt-1">{n.estatus === 1 ? <FaCircle className="text-blue-500 text-[10px]" /> : <FaCheck className="text-green-600 text-sm" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1 truncate">{n.asunto || 'Aviso'}</div>
                        <div className="text-[13px] leading-5 text-gray-700 line-clamp-3">{n.mensaje || ''}</div>
                        {n?.created_at && (
                          <div className="text-[11px] text-gray-500 mt-1">{formatDateTime(n.created_at)}</div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-white/90 flex justify-end">
                <button
                  onClick={() => { setIsOpen(false); setShowAllModal(true) }}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >Ver todas</button>
              </div>
            </div>
          </>
        ), document.body
      )}

      {mounted && showModal && selected && createPortal(
        (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); setSelected(undefined) }} />
            <div className="relative w-[92%] max-w-2xl mx-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
              {/* Header */}
              <div className="relative p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                      <FaBell className="text-white text-lg" />
                    </div>
                    <div>
                      <div className="text-xl font-extrabold leading-tight drop-shadow-sm">{selected.asunto || 'Aviso'}</div>
                      <div className="text-white/80 text-xs mt-0.5">Para: {user?.alumno_ref}</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selected.estatus === 1 ? 'bg-yellow-400/20 text-yellow-200 ring-1 ring-yellow-300/30' : 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30'}`}>
                    {selected.estatus === 1 ? 'No leído' : 'Leído'}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white">
                <div className="px-6 py-6">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {selected.mensaje}
                  </div>
                  {selected?.created_at && (
                    <div className="text-[12px] text-gray-500 mt-4">{formatDateTime(selected.created_at)}</div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <button
                  onClick={() => { setShowModal(false); setSelected(undefined) }}
                  className="px-4 py-2 rounded-lg bg-white text-gray-800 text-sm font-medium hover:bg-gray-100 border border-gray-200 shadow-sm"
                >Cerrar</button>
                <button
                  onClick={async () => {
                    if (selected.estatus === 1) {
                      const res = await markNotificationAsRead(selected.id)
                      if (res.success) {
                        setItems(prev => prev.map(i => i.id === selected.id ? { ...i, estatus: 2 } : i))
                        setCount(c => Math.max(0, (c || 0) - 1))
                      }
                    }
                    setSelected(s => (s ? { ...s, estatus: 2 } : s))
                    setShowModal(false)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm ${selected.estatus === 1 ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                >{selected.estatus === 1 ? 'Leído' : 'Leído'}</button>
              </div>
            </div>
          </div>
        ), document.body
      )}

      {mounted && showAllModal && createPortal(
        (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAllModal(false)} />
            <div className="relative w-[94%] max-w-3xl mx-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden bg-white">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                    <FaBell className="text-white text-lg" />
                  </div>
                  <div>
                    <div className="text-xl font-extrabold">Historial de notificaciones</div>
                    <div className="text-white/80 text-xs">Mostrando leídas y no leídas</div>
                  </div>
                </div>
                <button onClick={() => setShowAllModal(false)} className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm">Cerrar</button>
              </div>
              <div className="max-h-[70vh] overflow-auto divide-y divide-gray-100">
                {items.length === 0 ? (
                  <div className="p-6 text-sm text-gray-600">No hay notificaciones</div>
                ) : (
                  items.map(n => (
                    <div key={n.id} className="p-5 flex items-start gap-3">
                      <div className="mt-1">{n.estatus === 1 ? <FaCircle className="text-blue-500 text-[10px]" /> : <FaCheck className="text-green-600 text-sm" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-gray-900 truncate">{n.asunto || 'Aviso'}</div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${n.estatus === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>{n.estatus === 1 ? 'No leído' : 'Leído'}</span>
                        </div>
                        <div className="text-[13px] leading-5 text-gray-700 mt-1 whitespace-pre-wrap">{n.mensaje || ''}</div>
                        {n?.created_at && (
                          <div className="text-[11px] text-gray-500 mt-1">{formatDateTime(n.created_at)}</div>
                        )}
                      </div>
                      {n.estatus === 1 && (
                        <button
                          onClick={async () => {
                            const res = await markNotificationAsRead(n.id)
                            if (res.success) {
                              setItems(prev => prev.map(i => i.id === n.id ? { ...i, estatus: 2 } : i))
                              setCount(c => Math.max(0, (c || 0) - 1))
                            }
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >Marcar leído</button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                <button onClick={() => setShowAllModal(false)} className="px-4 py-2 rounded-lg bg-white text-gray-800 text-sm font-medium hover:bg-gray-100 border border-gray-200 shadow-sm">Cerrar</button>
              </div>
            </div>
          </div>
        ), document.body
      )}
    </div>
  )
}


