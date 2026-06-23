import { createAdminClient, createClient, type InsForgeClient } from '@insforge/sdk'
import {
  readServicesUserForFetch,
  requireInsforgeAdminEnv,
  servicesUserHeaderName,
} from './insforgeDbProxy'

function browserOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function browserDatabaseFetch(): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers)
    const user = readServicesUserForFetch()
    if (user) {
      headers.set(servicesUserHeaderName(), user)
    }
    return fetch(input, { ...init, headers })
  }
}

let browserClient: InsForgeClient | null = null
let serverClient: InsForgeClient | null = null

function createBrowserClient(): InsForgeClient {
  return createClient({
    baseUrl: browserOrigin(),
    anonKey: 'browser-proxy',
    fetch: browserDatabaseFetch(),
  })
}

function createServerClient(): InsForgeClient {
  const { baseUrl, apiKey } = requireInsforgeAdminEnv()
  return createAdminClient({ baseUrl, apiKey })
}

export function getInsforgeClient(): InsForgeClient {
  if (typeof window === 'undefined') {
    if (!serverClient) serverClient = createServerClient()
    return serverClient
  }
  if (!browserClient) browserClient = createBrowserClient()
  return browserClient
}

export function getDatabase() {
  return getInsforgeClient().database
}
