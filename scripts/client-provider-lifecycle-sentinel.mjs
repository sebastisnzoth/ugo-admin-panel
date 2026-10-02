import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
const r=JSON.parse(await fs.readFile('artifacts/client-provider-lifecycle-runtime.json','utf8'))
const j=JSON.parse(await fs.readFile('artifacts/client-provider-lifecycle-judge.json','utf8'))
assert.equal(r.sha,sha)
assert.equal(j.sha,sha)
assert.equal(j.status,'PASS')
assert.equal(r.environment,'UGO TEST')
assert.equal(r.production_touched,false)
assert.equal(r.limitations.simulated_service,true)
assert.equal(r.limitations.physical_gps_verified,false)
assert.equal(r.limitations.physical_camera_verified,false)
assert.equal(r.limitations.real_human_customer_acceptance,false)
assert.equal(r.limitations.live_microphone_hugo_verified,false)
const out={validator:'Sentinel',readiness_id:'client-provider-lifecycle',status:'PASS',sha,checks:['same-sha','judge-pass','ugo-test-only','production-untouched','automated-lifecycle-only','human-gates-not-faked'],checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-provider-lifecycle-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
