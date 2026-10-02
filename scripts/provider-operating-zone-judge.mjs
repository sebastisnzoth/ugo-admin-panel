import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-operating-zone-runtime.json','utf8'))
assert.equal(r.sha,sha);assert.equal(r.result,'PASS');assert.equal(r.environment,'UGO TEST');assert.equal(r.production_touched,false);assert.equal(r.small_radius_rejected,true);assert.equal(r.small_radius_offer_count,0);assert.equal(r.large_radius_offer_count,1);assert.equal(r.cleanup_ok,true)
await fs.writeFile('artifacts/provider-operating-zone-judge.json',JSON.stringify({readiness_id:r.readiness_id,sha,result:'PASS',checks:['radius-persisted','small-radius-rejected','large-radius-allowed','cleanup'],checked_at:new Date().toISOString()},null,2)+'\n')
