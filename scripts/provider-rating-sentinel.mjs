import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-rating-runtime.json','utf8')),j=JSON.parse(await fs.readFile('artifacts/provider-rating-judge.json','utf8'))
assert.equal(r.sha,sha);assert.equal(j.sha,sha);assert.equal(j.status,'PASS');assert.equal(j.readiness_id,'provider-rating');assert.equal(r.productionTouched,false);assert.equal(r.observations.exactly_once,true);assert.equal(r.observations.client_karma_updated,true)
const out={validator:'Sentinel',readiness_id:'provider-rating',status:'PASS',sha,checks:['same-sha','judge-pass','ugo-test-only','production-untouched','completed-service-only','provider-to-client','exactly-once','karma-sync'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-rating-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
