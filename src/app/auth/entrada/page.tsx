'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function EntradaSsoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { login, user, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return

    const ref = searchParams.get('ref')?.trim()
    const nombre = searchParams.get('nombre')?.trim()
    const next = searchParams.get('next')?.trim() || '/services'
    const destino = next.startsWith('/') ? next : `/${next}`

    if (!ref || !nombre) {
      setError('Enlace de acceso incompleto. Vuelve a entrar desde Servicios Administrativos.')
      return
    }

    if (user?.alumno_ref === ref) {
      router.replace(destino)
      return
    }

    login({
      alumno_ref: ref,
      alumno_nombre_completo: nombre,
    })
    router.replace(destino)
  }, [isLoading, searchParams, login, router, user?.alumno_ref])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white text-center">
        <div>
          <p className="mb-4">{error}</p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 font-semibold"
            onClick={() => router.replace('/dashboard')}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
      <p>Entrando al portal de servicios…</p>
    </div>
  )
}

export default function EntradaSsoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
          <p>Cargando…</p>
        </div>
      }
    >
      <EntradaSsoContent />
    </Suspense>
  )
}
