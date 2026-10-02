import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-jobs-runtime.json','utf8'))
assert.equal(r.sha,sha);assert.equal(r.readiness_id,'provider-jobs');assert.equal(r.environment,'UGO TEST');assert.equal(r.productionTouched,false);assert.equal(r.result,'PASS');assert.ok(r.serviceId)
for(const k of['completed_service_visible','dates_present','address_present','evidence_before_after_visible','evidence_bytes_readable','payment_visible','payment_amounts_concordant','timeline_visible','timeline_states_concordant'])assert.equal(r.observations?.[k],true,k)
assert.ok(r.counts.evidence>=2&&r.counts.events>=6&&r.counts.bytes>0)
const out={validator:'Judge',readiness_id:'provider-jobs',status:'PASS',sha,serviceId:r.serviceId,checks:Object.keys(r.observations),completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-jobs-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
