import { createClient } from 'npm:@supabase/supabase-js@2.108.1'
import { readBounded } from '../ugo-hive-backup-receiver/handler.mjs'

// Hive TEST-only planner. No tool execution or job creation.
const projectRef = 'tmossnqfwfwjrtzwcbmm'
const allowedUrl = 'https://' + projectRef + '.supabase.co'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const maxBodyBytes = 12_000
// No flag/env variable can bypass this gate. Enable only in a separately reviewed change.
const inferenceEnabled = true // TEST-only, gated by validated model, existing RUNNING mission and durable quota
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
  if (payload.action === 'check_openrouter_key' && Object.keys(payload).length === 1) {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY') || ''
    if (!apiKey) return errorResponse(503, 'OPENROUTER_KEY_NOT_CONFIGURED', id)
    try {
      const upstream = await fetch('https://openrouter.ai/api/v1/key', {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
      })
      if (!upstream.ok) return errorResponse(upstream.status === 401 ? 401 : 502, upstream.status === 401 ? 'OPENROUTER_KEY_REJECTED' : 'OPENROUTER_KEY_CHECK_FAILED', id)
      const json = await upstream.json()
      if (!json?.data || typeof json.data !== 'object') return errorResponse(502, 'OPENROUTER_INVALID_KEY_RESPONSE', id)
      return response(200, { ok: true, code: 'OPENROUTER_KEY_AUTHENTICATED', correlation_id: id,
        inference_verified: false, provider: 'openrouter' })
    } catch { return errorResponse(503, 'OPENROUTER_KEY_CHECK_UNREACHABLE', id) }
  }
  if (payload.action !== 'draft_plan' || typeof payload.objective !== 'string' || payload.objective.length < 8 ||
      payload.objective.length > 1500 || typeof payload.mission_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.mission_id) ||
      Object.keys(payload).some(k => !['action', 'objective', 'mission_id'].includes(k)))
    return errorResponse(400, 'INVALID_PLANNER_REQUEST', id)
  if (!inferenceEnabled) return errorResponse(503, 'HIVE_INFERENCE_NOT_ENABLED', id)
  const apiKey = Deno.env.get('OPENROUTER_API_KEY') || ''
  if (!apiKey) return errorResponse(503, 'OPENROUTER_KEY_NOT_CONFIGURED', id)
  // Select only an explicit :free model listed NOW by the provider with all known billing dimensions at zero.
  // A dynamic catalog is never sufficient alone; the outbound request also enforces max_price=0.
  let model: string
  try {
    const catalogResponse = await fetch('https://openrouter.ai/api/v1/models', {
      redirect: 'error', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' }
    })
    if (!catalogResponse.ok) return errorResponse(503, 'FREE_CATALOG_UNAVAILABLE', id)
    const catalog = await catalogResponse.json()
    const isZero = (v: unknown) => v === 0 || (typeof v === 'string' && /^0(?:\\.0+)?$/.test(v))
    const options = Array.isArray(catalog?.data) ? catalog.data.filter((m: any) =>
      typeof m.id === 'string' && m.id.endsWith(':free') && m.id !== 'openrouter/free' &&
      m.pricing && ['prompt','completion','request'].every(k => Object.hasOwn(m.pricing,k) && isZero(m.pricing[k])) &&
      Array.isArray(m.architecture?.output_modalities) && m.architecture.output_modalities.includes('text')
    ).map((m:any) => m.id).sort() : []
    if (!options.length) return errorResponse(503, 'NO_VERIFIED_FREE_MODEL', id)
    model = options[0]
  } catch { return errorResponse(503, 'FREE_CATALOG_UNREACHABLE', id) }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const requestId = crypto.randomUUID()
  const reservation = await admin.rpc('hive_reserve_model_call', {
    p_request: requestId, p_actor: userId, p_mission: payload.mission_id,
    p_provider: 'openrouter', p_tokens: 2048
  })
  if (reservation.error) return errorResponse(403, 'QUOTA_OR_MISSION_AUTH_FAILED', id)
  if (reservation.data?.allowed !== true)
    return response(429, { ok:false, code: reservation.data?.code || 'QUOTA_DENIED', correlation_id:id })
  const finish = async (ok: boolean, retry = 0) =>
    admin.rpc('hive_finish_model_call', { p_request:requestId, p_ok:ok, p_retry_seconds:retry })
  let upstream: Response
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST', redirect:'error', signal: AbortSignal.timeout(15000),
      headers:{ Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model, messages:[{role:'user',content:payload.objective}],
        max_tokens:512,stream:false,
        provider:{allow_fallbacks:false,require_parameters:true,
          max_price:{prompt:0,completion:0,request:0}} })
    })
  } catch {
    await finish(false,30).catch(()=>{})
    return errorResponse(503,'UPSTREAM_OUTCOME_UNKNOWN',id)
  }
  if (!upstream.ok) {
    await finish(false,30).catch(()=>{})
    return response(502,{ok:false,code:'UPSTREAM_REJECTED',upstream_status:upstream.status,correlation_id:id})
  }
  try {
    const body = new Uint8Array(await upstream.arrayBuffer())
    if (body.length > 32000) throw new Error('RESPONSE_TOO_LARGE')
    const data = JSON.parse(new TextDecoder().decode(body))
    const usage = data.usage
    if (data.model !== model || typeof data.choices?.[0]?.message?.content !== 'string' ||
      !data.choices[0].message.content.trim() ||
      !Number.isInteger(usage?.prompt_tokens) || !Number.isInteger(usage?.completion_tokens) ||
      usage.prompt_tokens < 0 || usage.completion_tokens < 0 ||
      usage.completion_tokens > 512 || usage.prompt_tokens + usage.completion_tokens > 2048 ||
      (Object.hasOwn(usage,'cost') && usage.cost !== 0)) throw new Error('UNVERIFIED_MODEL_OR_USAGE')
    const done = await finish(true)
    if (done.error) return errorResponse(503,'QUOTA_FINALIZATION_FAILED',id)
    return response(200,{ok:true,code:'HIVE_INFERENCE_VERIFIED',correlation_id:id,
      provider:'openrouter',model,text:data.choices[0].message.content,
      usage:{prompt_tokens:usage.prompt_tokens,completion_tokens:usage.completion_tokens},
      request_id:requestId})
  } catch {
    await finish(false,30).catch(()=>{})
    return errorResponse(502,'UNVERIFIED_UPSTREAM_RESPONSE',id)
  }
})
