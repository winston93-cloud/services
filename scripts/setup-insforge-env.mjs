#!/usr/bin/env node
/** Escribe variables InsForge en .env.local sin imprimir secretos. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(ROOT, '.env.local')
const desayunosCfg = JSON.parse(
  fs.readFileSync(path.join(ROOT, '.insforge/project.json'), 'utf8')
)
const serviciosCfgPath = path.resolve(ROOT, '../servicios_admin/.insforge/project.json')
const serviciosCfg = fs.existsSync(serviciosCfgPath)
  ? JSON.parse(fs.readFileSync(serviciosCfgPath, 'utf8'))
  : null

const anonKey = execSync('npx @insforge/cli secrets get ANON_KEY', {
  cwd: ROOT,
  encoding: 'utf8',
})
  .trim()
  .replace(/^ANON_KEY\s*=\s*/i, '')

const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split('\n') : []
const map = new Map()
for (const line of lines) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  map.set(t.slice(0, i).trim(), t.slice(i + 1).trim())
}

map.set('NEXT_PUBLIC_INSFORGE_URL', desayunosCfg.oss_host)
map.set('NEXT_PUBLIC_INSFORGE_ANON_KEY', anonKey)
map.set('INSFORGE_API_KEY', desayunosCfg.api_key)

if (serviciosCfg) {
  map.set('INSFORGE_SERVICIOS_URL', serviciosCfg.oss_host)
  map.set('INSFORGE_SERVICIOS_API_KEY', serviciosCfg.api_key)
}

const out = [
  '# Desayunos (InsForge)',
  `NEXT_PUBLIC_INSFORGE_URL=${map.get('NEXT_PUBLIC_INSFORGE_URL')}`,
  `NEXT_PUBLIC_INSFORGE_ANON_KEY=${map.get('NEXT_PUBLIC_INSFORGE_ANON_KEY')}`,
  `INSFORGE_API_KEY=${map.get('INSFORGE_API_KEY')}`,
  '',
  '# Winston Servicios — login manual alumno (solo servidor)',
  serviciosCfg ? `INSFORGE_SERVICIOS_URL=${map.get('INSFORGE_SERVICIOS_URL')}` : '# INSFORGE_SERVICIOS_URL=',
  serviciosCfg ? `INSFORGE_SERVICIOS_API_KEY=${map.get('INSFORGE_SERVICIOS_API_KEY')}` : '# INSFORGE_SERVICIOS_API_KEY=',
  '',
  '# Supabase legacy (solo migración; quitar tras cutover)',
]
if (map.has('NEXT_PUBLIC_SUPABASE_URL')) {
  out.push(`NEXT_PUBLIC_SUPABASE_URL=${map.get('NEXT_PUBLIC_SUPABASE_URL')}`)
}
if (map.has('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
  out.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${map.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')}`)
}

fs.writeFileSync(envPath, out.join('\n') + '\n')
console.log('✓ .env.local actualizado con InsForge (Desayunos + Winston Servicios)')
