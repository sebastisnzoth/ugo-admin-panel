import { createClient } from 'npm:@supabase/supabase-js@2.108.1'
import { readBounded } from '../ugo-hive-backup-receiver/handler.mjs'

// Hive TEST-only planner. No tool execution or job creation.
const projectRef = 'tmossnqfwfwjrtzwcbmm'
const allowedUrl = 'https://' + projectRef + '.supabase.co'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const maxBodyBytes = 12_000
// Runtime gate: set inferenceEnabled=true ONLY after same-SHA CI verification
// and when durable quota + billing evidence are persisted. Do not enable via env
// alone in production without the full review pipeline.
const inferenceEnabled = false
const reqId = () => crypto.randomUUID()
const response = (code: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), { status: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function errorResponse(status: number, code: string, id: string) {
  return response(status, { ok: false, code, correlation_id: id })
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
Deno.serve(async (req: Request) => {
  const id = reqId()
  if (req.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', id)
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    return errorResponse(415, 'JSON_REQUIRED', id)
  let userId: string | null
  try { userId = await authorize(req) } catch { return errorResponse(503, 'AUTH_UNAVAILABLE', id) }
  if (!userId) return errorResponse(403, 'SUPERADMIN_REQUIRED', id)
  if (Number(req.headers.get('content-length') || 0) > maxBodyBytes)
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', id)
  let payload: Record<string, unknown>
  try {
    const raw = new TextDecoder().decode(await readBounded(req, maxBodyBytes))
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON_OBJECT_REQUIRED')
    payload = parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'TOO_LARGE') return errorResponse(413, 'PAYLOAD_TOO_LARGE', id)
    return errorResponse(400, 'INVALID_JSON', id)
  }
  if (payload.action !== 'draft_plan' || typeof payload.objective !== 'string' || payload.objective.length < 8 ||
      payload.objective.length > 1500 || Object.keys(payload).some(k => !['action', 'objective'].includes(k)))
    return errorResponse(400, 'INVALID_PLANNER_REQUEST', id)
  // OPENROUTER_API_KEY and FREEAPI_API_KEY remain backend-only; no provider calls while gated.
  if (inferenceEnabled) {
    // Check durable quota before allowing any model call
    const { data: quota, error: quotaError } = await admin.from('hive_quotas')
      .select('daily_calls, monthly_calls, last_reset')
      .eq('agent_id', userId)
      .maybeSingle()
    if (quotaError || !quota) return errorResponse(503, 'QUOTA_CHECK_FAILED', id)
    if (quota.daily_calls >= 1000) return errorResponse(503, 'DAILY_QUOTA_EXCEEDED', id)
    if (quota.monthly_calls >= 10000) return errorResponse(503, 'MONTHLY_QUOTA_EXCEEDED', id)
  } else {
    return errorResponse(503, 'HIVE_INFERENCE_NOT_ENABLED', id)
  }

  // Fail closed: the DB-backed global quota and audited billing checks are not yet implemented.
  // Deployable scaffold does not call the paid-capable inference endpoint.
  return response(503, {
    ok: false, code: 'HIVE_INFERENCE_NOT_ENABLED',
    correlation_id: id, stage: 'AUTH_AND_REQUEST_VALIDATION_OK',
    reason: 'GLOBAL_DURABLE_ZERO_COST_QUOTA_REQUIRED',
    blockers: ['REMOTE_PERSISTENCE', 'DURABLE_QUOTA_RUNTIME', 'BILLING_EVIDENCE', 'INDEPENDENT_REVIEW', 'INFERENCE_AUTHORIZATION']
  })
})
