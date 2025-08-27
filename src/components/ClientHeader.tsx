'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsBell from '@/components/NotificationsBell'

export default function ClientHeader() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-gray-800">Sistema Integral de Servicios</div>
        <NotificationsBell />
      </div>
    </header>
  )
}


