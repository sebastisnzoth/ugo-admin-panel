import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
const r=JSON.parse(await fs.readFile('artifacts/cross-p0-runtime.json','utf8'))
assert.equal(r.readiness_id,'cross-p0')
assert.equal(r.sha,sha)
assert.equal(r.environment,'UGO TEST')
assert.equal(r.production_touched,false)
assert.equal(r.result,'PASS')
for(const key of['completed','offer_within_20km','lifecycle_chain','evidence_rows','cash_payment','bilateral_ratings','correlated_decision_ledger','correlated_evidence_ledger'])assert.equal(r.checks?.[key],true,key)
assert.equal(r.limitations?.simulated_service,true)
assert.equal(r.limitations?.physical_gps_verified,false)
assert.equal(r.limitations?.uploaded_media_verified,false)
assert.equal(r.limitations?.real_human_customer_acceptance,false)
const out={validator:'Judge',readiness_id:'cross-p0',status:'PASS',sha,service_id:r.service_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-p0-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
