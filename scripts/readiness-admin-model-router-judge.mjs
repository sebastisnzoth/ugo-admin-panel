import { readFile, writeFile } from 'node:fs/promises'

const p = JSON.parse(await readFile('artifacts/readiness-admin-model-router/runtime.json', 'utf8'))
const fail = (m) => { throw new Error('JUDGE_FAIL:' + m) }
if (p.readiness_id !== 'admin-model-router' || p.environment !== 'UGO TEST') fail('identity')
if (!Array.isArray(p.routes) || p.routes.length < 3 || p.routes.some(r => r.status !== 'READY' || Number(r.max_cost) !== 0 || !r.primary?.provider || !r.fallback?.provider)) fail('routes')
if (!p.primary_runtime?.success || Number(p.primary_runtime.cost) !== 0) fail('primary')
if (!p.fallback_runtime?.metrics?.some(m => m.success) || !p.fallback_runtime.metrics.some(m => !m.success && m.failure_code) || p.fallback_runtime.metrics.some(m => Number(m.cost) !== 0)) fail('fallback')
if (!p.telemetry?.all_zero_cost || !p.telemetry?.has_quality || !p.telemetry?.has_latency) fail('telemetry')
const out = { validator:'Judge', verdict:'PASS', checked_at:new Date().toISOString(), runtime_sha:p.runtime_sha, readiness_id:p.readiness_id }
await writeFile('artifacts/readiness-admin-model-router/judge.json', JSON.stringify(out, null, 2) + '\n')
console.log(JSON.stringify(out))
