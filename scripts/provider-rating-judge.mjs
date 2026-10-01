import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-rating-runtime.json','utf8'))
assert.equal(r.sha,sha);assert.equal(r.readiness_id,'provider-rating');assert.equal(r.environment,'UGO TEST');assert.equal(r.productionTouched,false);assert.equal(r.result,'PASS');assert.ok(r.serviceId&&r.ratingId)
for(const k of['completed_only','provider_rating_persisted','duplicate_rejected','exactly_once','provider_readback','client_karma_updated'])assert.equal(r.observations?.[k],true,k)
assert.equal(r.clientKarma,4)
const out={validator:'Judge',readiness_id:'provider-rating',status:'PASS',sha,serviceId:r.serviceId,ratingId:r.ratingId,checks:Object.keys(r.observations),completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-rating-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
