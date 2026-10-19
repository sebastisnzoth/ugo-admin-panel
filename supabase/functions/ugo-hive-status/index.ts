import { createClient } from 'npm:@supabase/supabase-js@2.108.1'
const PROJECT = 'https://tmossnqfwfwjrtzwcbmm.supabase.co'
const PING = 'https://ugo-hive-freeapi.onrender.com/api/ping'
const allowedOrigins = new Set(['https://sebastisnzoth.github.io', 'http://localhost:5173', 'http://localhost:5174'])
const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {}
}
const json = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...cors(req) } })
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    if (!allowedOrigins.has(req.headers.get('origin') || '')) return json(req, 403, { code: 'ORIGIN_DENIED' })
    return new Response(null, { status: 204, headers: { ...cors(req), 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type', 'access-control-max-age': '300' } })
  }
  if (req.headers.has('origin') && !allowedOrigins.has(req.headers.get('origin') || '')) return json(req, 403, { code: 'ORIGIN_DENIED' })
  if (req.method !== 'GET') return json(req, 405, { code: 'METHOD_NOT_ALLOWED' })
  if (new URL(req.url).search) return json(req, 400, { code: 'QUERY_NOT_ALLOWED' })
  const url = Deno.env.get('SUPABASE_URL') || ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (url !== PROJECT || !key) return json(req, 503, { code: 'TEST_GATE_NOT_CONFIGURED' })
  const header = req.headers.get('authorization') || ''
  if (!/^Bearer [^\s]{20,}$/.test(header)) return json(req, 401, { code: 'AUTH_REQUIRED' })
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: verified, error: authError } = await db.auth.getUser(header.slice(7))
  if (authError || !verified.user) return json(req, 401, { code: 'INVALID_SESSION' })
  const { data: profile, error: profileError } = await db.from('usuarios').select('tipo,activo').eq('id', verified.user.id).maybeSingle()
  if (profileError) return json(req, 503, { code: 'PROFILE_CHECK_FAILED' })
  if (profile?.activo !== true || String(profile?.tipo).toLowerCase() !== 'superadmin') return json(req, 403, { code: 'SUPERADMIN_REQUIRED' })
  const { data: snapshot, error: backupError } = await db.from('hive_backup_versions').select('version,bytes,created_at').order('sequence', { ascending: false }).limit(1).maybeSingle()
  const started = Date.now()
  let online = false
  try {
    const response = await fetch(PING, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(4500), headers: { 'accept': 'application/json' } })
    online = response.ok
  } catch { /* Explicitly report unavailable, never fake readiness */ }
  return json(req, 200, {
    environment: 'TEST',
    backend: { reachable: online, checked_at: new Date().toISOString(), latency_ms: Date.now() - started },
    backup: backupError ? { state: 'UNKNOWN' } : snapshot ? { state: 'RECORDED', version: snapshot.version, bytes: snapshot.bytes, created_at: snapshot.created_at } : { state: 'NONE' },
    inference: { state: 'DISABLED', verified_runtime: false },
    autonomy: { state: 'NOT_ENABLED_BY_HIVE' }
  })
})
