import { createAdminClient } from '@insforge/sdk'
import { NextResponse } from 'next/server'

function serviciosAdmin() {
  const baseUrl = process.env.INSFORGE_SERVICIOS_URL
  const apiKey = process.env.INSFORGE_SERVICIOS_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('Faltan INSFORGE_SERVICIOS_URL e INSFORGE_SERVICIOS_API_KEY')
  }
  return createAdminClient({ baseUrl, apiKey })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { numeroControl?: string }
    const numeroControl = body.numeroControl?.trim()
    if (!numeroControl) {
      return NextResponse.json({ success: false, error: 'Número de control requerido' }, { status: 400 })
    }

    const refNum = Number(numeroControl)
    const refFilter = Number.isFinite(refNum) ? refNum : numeroControl

    const { data, error } = await serviciosAdmin()
      .database.from('alumno')
      .select('alumno_ref, alumno_app, alumno_apm, alumno_nombre')
      .eq('alumno_ref', refFilter)
      .maybeSingle()

    if (error || !data?.alumno_ref) {
      return NextResponse.json({ success: false, error: 'Número de control no encontrado' })
    }

    const nombre = [data.alumno_app, data.alumno_apm, data.alumno_nombre]
      .filter(Boolean)
      .join(' ')
      .trim()

    return NextResponse.json({
      success: true,
      user: {
        alumno_ref: String(data.alumno_ref),
        alumno_nombre_completo: nombre || `Alumno ${data.alumno_ref}`,
      },
    })
  } catch (e) {
    console.error('login alumno:', e)
    return NextResponse.json(
      { success: false, error: 'Error de conexión. Intente nuevamente.' },
      { status: 500 }
    )
  }
}
