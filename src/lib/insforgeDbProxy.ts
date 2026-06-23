const USER_HEADER = 'x-services-user'

export function readServicesUserForFetch(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('user')
  } catch {
    return null
  }
}

export function servicesUserHeaderName(): string {
  return USER_HEADER
}

export function parseServicesUserHeader(raw: string | null): { alumno_ref: string } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { alumno_ref?: string }
    if (parsed?.alumno_ref) return { alumno_ref: String(parsed.alumno_ref) }
  } catch {
    /* inválido */
  }
  return null
}

export function requireInsforgeAdminEnv() {
  const baseUrl =
    process.env.NEXT_PUBLIC_INSFORGE_URL ??
    process.env.INSFORGE_URL ??
    process.env.INSFORGE_DESAYUNOS_URL
  const apiKey =
    process.env.INSFORGE_API_KEY ??
    process.env.INSFORGE_DESAYUNOS_API_KEY ??
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  if (!baseUrl || !apiKey) {
    throw new Error(
      'Faltan URL y API key de InsForge (Desayunos). En Vercel configura NEXT_PUBLIC_INSFORGE_URL e INSFORGE_API_KEY.'
    )
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey: apiKey.trim().replace(/^ANON_KEY\s*=\s*/i, '') }
}

export async function proxyInsforgeDatabaseRequest(
  request: Request,
  upstreamPath: string
): Promise<Response> {
  try {
    const user = parseServicesUserHeader(request.headers.get(USER_HEADER))
    if (!user) {
      return Response.json(
        { message: 'Sesión requerida. Vuelve a entrar al portal.' },
        { status: 401 }
      )
    }

    const { baseUrl, apiKey } = requireInsforgeAdminEnv()
    const incoming = new URL(request.url)
    const target = `${baseUrl}${upstreamPath}${incoming.search}`

    const headers = new Headers()
    const contentType = request.headers.get('content-type')
    if (contentType) headers.set('Content-Type', contentType)
    const prefer = request.headers.get('prefer')
    if (prefer) headers.set('Prefer', prefer)
    const range = request.headers.get('range')
    if (range) headers.set('Range', range)
    headers.set('Authorization', `Bearer ${apiKey}`)
    headers.set('apikey', apiKey)

    const method = request.method
    const body =
      method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()

    const upstream = await fetch(target, { method, headers, body })

    const responseHeaders = new Headers()
    const passHeaders = ['content-type', 'content-range', 'preference-applied']
    for (const name of passHeaders) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }

    if (!upstream.ok) {
      const errText = await upstream.text()
      console.error('[insforge-proxy]', upstream.status, target, errText.slice(0, 300))
      return new Response(errText || upstream.statusText, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      })
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del proxy'
    console.error('[insforge-proxy] fatal:', error)
    return Response.json({ message }, { status: 503 })
  }
}
