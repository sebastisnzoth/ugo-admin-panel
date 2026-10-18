import { createClient } from 'npm:@supabase/supabase-js@2.108.1'

// Hive TEST-only planner. No tool execution or job creation.
const projectRef = 'tmossnqfwfwjrtzwcbmm'
const allowedUrl = 'https://' + projectRef + '.supabase.co'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') || ''
const upstream = 'https://openrouter.ai/api/v1'
const maxBodyBytes = 12_000
const maxDailyCalls = 20
const localWindow = new Map<string, { day: string; count: number; latest: number }>()
const reqId = () => crypto.randomUUID()
const response = (code: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), { status: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function errorResponse(status: number, code: string, id: string) {
  return response(status, { ok: false, code, correlation_id: id })
}
function isFreeModel(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false
  const prices = p as Record<string, unknown>
  // Reject unknown dimensions; only zero-valued explicit listed charges.
  for (const [key, val] of Object.entries(prices)) {
    if (key === 'discount') continue
    if (val === null || val === undefined || typeof val === 'object') return false
    if (typeof val !== 'number' && typeof val !== 'string') return false
    if (String(val).trim() === '' || !Number.isFinite(Number(val)) || Number(val) !== 0) return false
  }
  return Object.prototype.hasOwnProperty.call(prices, 'prompt') &&
    Object.prototype.hasOwnProperty.call(prices, 'completion') &&
    Object.prototype.hasOwnProperty.call(prices, 'request')
}
async function loadFreeModel(key: string): Promise<string | null> {
  const r = await fetch(upstream + '/models', {
    headers: { authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(6000)
  })
  if (!r.ok) return null
  const payload = await r.json()
  const models = Array.isArray(payload?.data) ? payload.data : []
  const eligible = models.filter((m: Record<string, unknown>) =>
    typeof m.id === 'string' &&
    m.id.endsWith(':free') &&
    isFreeModel(m.pricing) &&
    (m.architecture as Record<string, unknown> | undefined)?.output_modalities instanceof Array &&
    ((m.architecture as Record<string, unknown>).output_modalities as unknown[]).includes('text')
  )
  return eligible.length ? String(eligible[0].id) : null
}
async function authorize(req: Request) {
  if (supabaseUrl !== allowedUrl || !serviceKey) return null
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  if (!token || token.length > 4096) return null
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile, error: pError } = await admin.from('usuarios')
    .select('tipo,activo').eq('id', data.user.id).maybeSingle()
  if (pError || profile?.activo !== true || String(profile.tipo).toLowerCase() !== 'superadmin') return null
  return data.user.id as string
}
function limit(userId: string): boolean {
  // Best-effort local limiter; NOT suitable as distributed quota protection.
  // Live inference must remain disabled pending atomic, DB-backed limits.
  const day = new Date().toISOString().slice(0, 10)
  const old = localWindow.get(userId)
  if (old && old.day === day && old.count >= maxDailyCalls) return false
  localWindow.set(userId, { day, count: (old?.day === day ? old.count : 0) + 1, latest: Date.now() })
  return true
}
Deno.serve(async (req: Request) => {
  const id = reqId()
  if (req.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', id)
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    return errorResponse(415, 'JSON_REQUIRED', id)
  const userId = await authorize(req)
  if (!userId) return errorResponse(403, 'SUPERADMIN_REQUIRED', id)
  if (Number(req.headers.get('content-length') || 0) > maxBodyBytes)
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', id)
  let payload: Record<string, unknown>
  try {
    const raw = await req.text()
    if (raw.length > maxBodyBytes) return errorResponse(413, 'PAYLOAD_TOO_LARGE', id)
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON_OBJECT_REQUIRED')
    payload = parsed
  } catch {
    return errorResponse(400, 'INVALID_JSON', id)
  }
  if (payload.action !== 'draft_plan' || typeof payload.objective !== 'string' || payload.objective.length < 8 ||
      payload.objective.length > 1500 || Object.keys(payload).some(k => !['action', 'objective'].includes(k)))
    return errorResponse(400, 'INVALID_PLANNER_REQUEST', id)
  if (!openRouterKey) return errorResponse(503, 'OPENROUTER_SECRET_UNAVAILABLE', id)
  if (!limit(userId)) return errorResponse(429, 'LOCAL_RATE_LIMIT', id)

  // Fail closed: the DB-backed global quota and audited billing checks are not yet implemented.
  // Deployable scaffold does not call the paid-capable inference endpoint.
  return response(503, {
    ok: false, code: 'HIVE_INFERENCE_NOT_ENABLED',
    correlation_id: id, stage: 'AUTH_AND_REQUEST_VALIDATION_OK',
    reason: 'GLOBAL_DURABLE_ZERO_COST_QUOTA_REQUIRED'
  })
})
