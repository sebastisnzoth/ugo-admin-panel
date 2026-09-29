import { readFile, writeFile } from 'node:fs/promises'

const p = JSON.parse(await readFile('artifacts/readiness-admin-model-router/runtime.json', 'utf8'))
const fail = (m) => { throw new Error('SENTINEL_FAIL:' + m) }
if (p.production_touched !== false) fail('production')
if (p.test_project !== 'tmossnqfwfwjrtzwcbmm' || p.environment !== 'UGO TEST') fail('environment')
if (process.env.GITHUB_SHA && p.runtime_sha !== process.env.GITHUB_SHA) fail('sha_mismatch')
if (p.routes.some(r => Number(r.max_cost) !== 0) || p.fallback_runtime.metrics.some(m => Number(m.cost) !== 0) || Number(p.primary_runtime.cost) !== 0) fail('cost_policy')
const out = { validator:'Sentinel', verdict:'PASS', checked_at:new Date().toISOString(), runtime_sha:p.runtime_sha, readiness_id:p.readiness_id, production_touched:false }
await writeFile('artifacts/readiness-admin-model-router/sentinel.json', JSON.stringify(out, null, 2) + '\n')
console.log(JSON.stringify(out))
