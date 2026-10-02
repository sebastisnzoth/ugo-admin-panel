import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
const r=JSON.parse(await fs.readFile('artifacts/cross-regression-runtime.json','utf8'))
const j=JSON.parse(await fs.readFile('artifacts/cross-regression-judge.json','utf8'))
assert.equal(r.sha,sha)
assert.equal(j.sha,sha)
assert.equal(j.status,'PASS')
assert.equal(r.production_touched,false)
assert.equal(r.failing_tests,0)
assert.ok(r.critical_incidents.includes('provider-offer-dispatch-1404'))
assert.ok(r.critical_incidents.includes('scheduled-worker-queue-isolation'))
const out={validator:'Sentinel',readiness_id:'cross-regression',status:'PASS',sha,checks:['judge-pass','same-sha','production-untouched','incident-regressions-persisted'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-regression-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
