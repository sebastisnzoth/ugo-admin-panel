import { mkdir, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const url = process.env.UGO_TEST_SUPABASE_URL || ''
const key = process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY || ''
if (url !== 'https://tmossnqfwfwjrtzwcbmm.supabase.co' || !key) throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const [{ data: routes, error: re }, { data: candidates, error: ce }, { data: metrics, error: me }] = await Promise.all([
  db.from('autonomous_model_routes').select('*').order('task_class'),
  db.from('autonomous_model_candidates').select('*').order('updated_at', { ascending: false }),
  db.from('autonomous_model_metrics').select('*').order('created_at', { ascending: false }).limit(100)
])
if (re || ce || me) throw re || ce || me

const byId = new Map((candidates || []).map(c => [c.id, c]))
const normalized = (routes || []).map(r => ({
  task_class: r.task_class, status: r.status, max_cost: Number(r.max_cost),
  primary: byId.get(r.primary_candidate_id) || null,
  fallback: byId.get(r.fallback_candidate_id) || null,
  updated_at: r.updated_at
}))
if (normalized.length < 3) throw new Error('MODEL_ROUTES_MISSING')
for (const r of normalized) {
  if (r.status !== 'READY' || r.max_cost !== 0) throw new Error('MODEL_ROUTE_NOT_READY:' + r.task_class)
  for (const [kind, c] of [['primary', r.primary], ['fallback', r.fallback]]) {
    if (!c || !c.free_tier || !c.eligible || c.availability !== 'AVAILABLE') throw new Error('MODEL_' + String(kind).toUpperCase() + '_INVALID:' + r.task_class)
  }
}

const byCorrelation = new Map()
for (const m of metrics || []) {
  if (!m.correlation_id) continue
  const a = byCorrelation.get(m.correlation_id) || []
  a.push(m)
  byCorrelation.set(m.correlation_id, a)
}
const fallbackPair = [...byCorrelation.entries()].find(([, rows]) => rows.some(m => !m.success && m.failure_code) && rows.some(m => m.success))
if (!fallbackPair) throw new Error('FALLBACK_TELEMETRY_PAIR_MISSING')
const [fallbackCorrelation, fallbackMetrics] = fallbackPair
const primarySuccess = (metrics || []).find(m => m.success && byId.get(m.candidate_id)?.provider === 'gemini')
if (!primarySuccess) throw new Error('PRIMARY_RUNTIME_SUCCESS_MISSING')

const payload = {
  schema_version: 'UGO_READINESS_ADMIN_MODEL_ROUTER_V1',
  readiness_id: 'admin-model-router',
  task_id: 'readiness-admin-model-router',
  job_id: 'UGO-READINESS-ADMIN-MODEL-ROUTER',
  environment: 'UGO TEST',
  runtime_sha: process.env.GITHUB_SHA || 'local',
  production_touched: false,
  test_project: 'tmossnqfwfwjrtzwcbmm',
  generated_at: new Date().toISOString(),
  routes: normalized.map(r => ({ task_class:r.task_class,status:r.status,max_cost:r.max_cost,primary:{provider:r.primary.provider,model:r.primary.model_id},fallback:{provider:r.fallback.provider,model:r.fallback.model_id},updated_at:r.updated_at })),
  primary_runtime: { correlation_id:primarySuccess.correlation_id,provider:byId.get(primarySuccess.candidate_id)?.provider,model:byId.get(primarySuccess.candidate_id)?.model_id,quality_score:primarySuccess.quality_score,latency_ms:primarySuccess.latency_ms,cost:Number(primarySuccess.cost),success:true },
  fallback_runtime: { correlation_id:fallbackCorrelation,metrics:fallbackMetrics.map(m => ({ provider:byId.get(m.candidate_id)?.provider,model:byId.get(m.candidate_id)?.model_id,success:m.success,quality_score:m.quality_score,latency_ms:m.latency_ms,cost:Number(m.cost),failure_code:m.failure_code })) },
  telemetry: { rows:(metrics || []).length,all_zero_cost:(metrics || []).every(m => Number(m.cost) === 0),has_quality:(metrics || []).some(m => m.quality_score != null),has_latency:(metrics || []).some(m => m.latency_ms != null) }
}
await mkdir('artifacts/readiness-admin-model-router', { recursive: true })
await writeFile('artifacts/readiness-admin-model-router/runtime.json', JSON.stringify(payload, null, 2) + '\n')
console.log(JSON.stringify({ pass:true,readiness_id:payload.readiness_id,routes:payload.routes.length,primary:payload.primary_runtime,fallback_correlation_id:fallbackCorrelation,telemetry:payload.telemetry }))
