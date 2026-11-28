#!/usr/bin/env node
// UGO Hive · endpoint autenticado de la consola Super Admin (TEST).
//
// Reglas de diseño:
//   · autenticación obligatoria (JWT de Supabase) y autorización de SUPERADMIN, verificadas
//     en el servidor; el cliente nunca decide quién es;
//   · lectura con un rol separado (`hive_reader`), sin escritura ni ejecución de cola;
//   · el servidor se niega a arrancar si el rol puede escribir;
//   · sin query strings, sin métodos de escritura, sin caché, sin reflejar errores de base
//     (un mensaje de PostgreSQL puede contener la cadena de conexión);
//   · límite de peticiones por usuario y orígenes permitidos acotados.

import { createServer } from 'node:http'
import { readSnapshot, readerFacts, SnapshotError } from './snapshot.mjs'
import { redact } from '../worker/config.mjs'

export const ALLOWED_ORIGINS = new Set([
  'https://sebastisnzoth.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
])

const BEARER = /^Bearer [^\s]{20,}$/
const DEFAULT_LIMITS = { perMinute: 60, maxBytes: 4096 }

const corsFor = origin => (ALLOWED_ORIGINS.has(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {})

const send = (req, res, status, body) => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...corsFor(req.headers.origin || ''),
  }
  res.writeHead(status, headers).end(JSON.stringify(body))
}

/**
 * @param {object} options
 * @param {{ readSnapshot: () => object }} options.reader  cliente de SÓLO lectura
 * @param {(token: string) => Promise<{userId: string, superadmin: boolean, active: boolean}>} options.verifyToken
 */
export function createHiveConsoleApi({ reader, verifyToken, clock = () => Date.now(), limits = DEFAULT_LIMITS }) {
  if (!reader || typeof reader.readSnapshot !== 'function') throw new Error('READER_REQUIRED')
  if (typeof verifyToken !== 'function') throw new Error('VERIFIER_REQUIRED')

  const hits = new Map()

  const rateLimited = userId => {
    const now = clock()
    const windowStart = now - (now % 60000)
    const entry = hits.get(userId)
    if (!entry || entry.windowStart !== windowStart) {
      hits.set(userId, { windowStart, count: 1 })
      if (hits.size > 5000) hits.clear()
      return false
    }
    entry.count += 1
    return entry.count > limits.perMinute
  }

  return async function handler(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const origin = req.headers.origin || ''

    if (req.method === 'OPTIONS') {
      if (!ALLOWED_ORIGINS.has(origin)) return send(req, res, 403, { code: 'ORIGIN_DENIED' })
      res.writeHead(204, {
        ...corsFor(origin),
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '300',
      }).end()
      return
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(req, res, 403, { code: 'ORIGIN_DENIED' })
    if (req.method !== 'GET') return send(req, res, 405, { code: 'METHOD_NOT_ALLOWED' })
    if (url.search) return send(req, res, 400, { code: 'QUERY_NOT_ALLOWED' })

    if (url.pathname === '/healthz') {
      return send(req, res, 200, { ok: true, service: 'ugo-hive-console-api', environment: 'TEST' })
    }
    if (url.pathname !== '/api/hive/snapshot') return send(req, res, 404, { code: 'NOT_FOUND' })

    const header = req.headers.authorization || ''
    if (!BEARER.test(header)) return send(req, res, 401, { code: 'AUTH_REQUIRED' })

    let identity
    try {
      identity = await verifyToken(header.slice(7))
    } catch {
      // Un fallo del verificador no se convierte en "sin permiso": es indisponibilidad.
      return send(req, res, 503, { code: 'AUTH_UNAVAILABLE' })
    }
    if (!identity?.userId) return send(req, res, 401, { code: 'INVALID_SESSION' })
    if (identity.active !== true) return send(req, res, 403, { code: 'USER_INACTIVE' })
    if (identity.superadmin !== true) return send(req, res, 403, { code: 'SUPERADMIN_REQUIRED' })
    if (rateLimited(identity.userId)) return send(req, res, 429, { code: 'RATE_LIMITED' })

    try {
      const snapshot = reader.readSnapshot()
      return send(req, res, 200, snapshot)
    } catch (error) {
      const code = error instanceof SnapshotError ? error.code : 'HIVE_READ_FAILED'
      // Nunca se devuelve el texto del error: puede contener detalles de conexión.
      process.stderr.write(`${redact(JSON.stringify({ ts: new Date().toISOString(), event: 'SNAPSHOT_ERROR', code }))}\n`)
      return send(req, res, 503, { code })
    }
  }
}

/**
 * Verificador real. La identidad la confirma Supabase Auth con la clave **pública** (anon);
 * la autorización de Super Admin se decide SIN credenciales privilegiadas:
 *
 *   user      (por defecto) → lee `usuarios` con el token del propio usuario (RLS decide)
 *   allowlist               → lista blanca en el servidor (HIVE_CONSOLE_SUPERADMIN_IDS)
 *   service                 → clave de servicio; sólo si se pide explícitamente
 */
export const AUTH_MODES = Object.freeze(['user', 'allowlist', 'service'])

export function supabaseVerifier({
  mode = 'user', url, anonKey, serviceKey = '', superadminIds = [], fetchImpl = globalThis.fetch, timeoutMs = 8000,
}) {
  if (!AUTH_MODES.includes(mode)) throw new Error('AUTH_MODE_INVALID')
  if (!url || !anonKey) throw new Error('SUPABASE_VERIFIER_NOT_CONFIGURED')
  if (mode === 'service' && !serviceKey) throw new Error('SERVICE_KEY_REQUIRED_FOR_SERVICE_MODE')
  const allowed = new Set(superadminIds.map(id => String(id).trim().toLowerCase()).filter(Boolean))

  return async token => {
    // 1 · identidad: siempre con la clave pública y el token del usuario.
    const userResponse = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    })
    if (userResponse.status === 401) return { userId: null, superadmin: false, active: false }
    if (!userResponse.ok) throw new Error('AUTH_UNAVAILABLE')
    const user = await userResponse.json()
    if (!user?.id) return { userId: null, superadmin: false, active: false }
    const active = !user.banned_until && user.deleted_at === undefined

    // 2a · lista blanca decidida en el servidor: sin tocar tablas ni usar claves privadas.
    if (mode === 'allowlist') {
      return { userId: user.id, superadmin: active && allowed.has(String(user.id).toLowerCase()), active }
    }

    // 2b · perfil. En modo `user` la consulta viaja con el token del usuario (RLS); en modo
    // `service` (explícito) con la clave de servicio.
    const bearer = mode === 'service' ? serviceKey : token
    const apikey = mode === 'service' ? serviceKey : anonKey
    const profileResponse = await fetchImpl(
      `${url}/rest/v1/usuarios?select=tipo,activo&id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: { apikey, authorization: `Bearer ${bearer}` },
        signal: AbortSignal.timeout(timeoutMs), redirect: 'error' })
    if (profileResponse.status === 401 || profileResponse.status === 403) throw new Error('PROFILE_FORBIDDEN')
    if (!profileResponse.ok) throw new Error('PROFILE_UNAVAILABLE')
    const rows = await profileResponse.json()
    const profile = Array.isArray(rows) ? rows[0] : null
    return {
      userId: user.id,
      superadmin: profile?.activo === true && String(profile?.tipo).toLowerCase() === 'superadmin',
      active: profile?.activo === true && active,
    }
  }
}

async function main() {
  const { PsqlClient } = await import('../worker/db.mjs')
  const readerUrl = process.env.HIVE_READER_DATABASE_URL || ''
  const supabaseUrl = process.env.HIVE_CONSOLE_SUPABASE_URL || ''
  const anonKey = process.env.HIVE_CONSOLE_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.HIVE_CONSOLE_SUPABASE_SERVICE_KEY || ''
  const mode = process.env.HIVE_CONSOLE_AUTH_MODE || 'user'
  const superadminIds = (process.env.HIVE_CONSOLE_SUPERADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean)
  const port = Number(process.env.PORT || 8790)
  const host = process.env.HOST || '0.0.0.0'

  if (!AUTH_MODES.includes(mode)) {
    process.stderr.write(`${JSON.stringify({ event: 'CONFIG_ERROR', reason: 'AUTH_MODE_INVALID', mode })}\n`)
    process.exit(2)
  }
  const missing = [
    !readerUrl && 'HIVE_READER_DATABASE_URL',
    !supabaseUrl && 'HIVE_CONSOLE_SUPABASE_URL',
    !anonKey && 'HIVE_CONSOLE_SUPABASE_ANON_KEY',
    mode === 'allowlist' && superadminIds.length === 0 && 'HIVE_CONSOLE_SUPERADMIN_IDS',
    mode === 'service' && !serviceKey && 'HIVE_CONSOLE_SUPABASE_SERVICE_KEY',
  ].filter(Boolean)
  if (missing.length) {
    process.stderr.write(`${JSON.stringify({ event: 'CONFIG_ERROR', reason: 'missing', variables: missing })}\n`)
    process.exit(2)
  }
  if (mode === 'service') {
    // Modo privilegiado: se permite, pero nunca en silencio.
    process.stderr.write(`${JSON.stringify({ event: 'PRIVILEGED_MODE', mode, note: 'usa una clave de servicio de Supabase; preferir user/allowlist' })}\n`)
  }

  const client = new PsqlClient({ databaseUrl: readerUrl })
  const facts = readerFacts(client)
  if (!facts.ok) {
    process.stderr.write(`${JSON.stringify({ event: 'REFUSED', code: 'READER_NOT_READ_ONLY', violations: facts.violations })}\n`)
    process.exit(3)
  }

  const handler = createHiveConsoleApi({
    reader: { readSnapshot: () => readSnapshot(client) },
    verifyToken: supabaseVerifier({ mode, url: supabaseUrl, anonKey, serviceKey, superadminIds }),
  })
  const server = createServer((req, res) => {
    handler(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' }).end('{"code":"INTERNAL_ERROR"}')
    })
  })
  server.listen(port, host, () => {
    process.stdout.write(`${JSON.stringify({
      event: 'CONSOLE_API_LISTENING', port, host, auth_mode: mode,
      privileged_credentials: mode === 'service',
      reader: { user: facts.current_user, read_only: true, can_select_jobs: facts.can_select_jobs },
    })}\n`)
  })

  const shutdown = signal => {
    process.stdout.write(`${JSON.stringify({ event: 'SHUTDOWN', signal })}\n`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    process.stderr.write(`${JSON.stringify({ event: 'CRASH', error: redact(String(error?.message ?? error)) })}\n`)
    process.exit(1)
  })
}
