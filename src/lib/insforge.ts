import { createClient, type InsForgeClient } from '@insforge/sdk'

let client: InsForgeClient | null = null

export function getInsforgeClient(): InsForgeClient {
  if (client) return client
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  if (!baseUrl || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_INSFORGE_URL y NEXT_PUBLIC_INSFORGE_ANON_KEY en el entorno.'
    )
  }
  client = createClient({ baseUrl, anonKey })
  return client
}

export function getDatabase() {
  return getInsforgeClient().database
}
