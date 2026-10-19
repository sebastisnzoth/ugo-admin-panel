import { createClient } from 'npm:@supabase/supabase-js@2.108.1'
const PROJECT = 'https://tmossnqfwfwjrtzwcbmm.supabase.co'
const PING = 'https://ugo-hive-freeapi.onrender.com/api/ping'
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return json(405, { code: 'METHOD_NOT_ALLOWED' })
  if (new URL(req.url).search) return json(400, { code: 'QUERY_NOT_ALLOWED' })
  const url = Deno.env.get('SUPABASE_URL') || ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (url !== PROJECT || !key) return json(503, { code: 'TEST_GATE_NOT_CONFIGURED' })
  const header = req.headers.get('authorization') || ''
  if (!/^Bearer [^\s]{20,}$/.test(header)) return json(401, { code: 'AUTH_REQUIRED' })
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: verified, error: authError } = await db.auth.getUser(header.slice(7))
  if (authError || !verified.user) return json(401, { code: 'INVALID_SESSION' })
  const { data: profile, error: profileError } = await db.from('usuarios').select('tipo,activo').eq('id', verified.user.id).maybeSingle()
  if (profileError) return json(503, { code: 'PROFILE_CHECK_FAILED' })
  if (profile?.activo !== true || String(profile?.tipo).toLowerCase() !== 'superadmin') return json(403, { code: 'SUPERADMIN_REQUIRED' })
  const { data: snapshot, error: backupError } = await db.from('hive_backup_versions').select('version,bytes,created_at').order('sequence', { ascending: false }).limit(1).maybeSingle()
  const started = Date.now()
  let online = false
  try {
    const response = await fetch(PING, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(4500), headers: { 'accept': 'application/json' } })
    online = response.ok
  } catch { /* Explicitly report unavailable, never fake readiness */ }
  return json(200, {
    environment: 'TEST',
    backend: { reachable: online, checked_at: new Date().toISOString(), latency_ms: Date.now() - started },
    backup: backupError ? { state: 'UNKNOWN' } : snapshot ? { state: 'RECORDED', version: snapshot.version, bytes: snapshot.bytes, created_at: snapshot.created_at } : { state: 'NONE' },
    inference: { state: 'DISABLED', verified_runtime: false },
    autonomy: { state: 'NOT_ENABLED_BY_HIVE' }
  })
})
