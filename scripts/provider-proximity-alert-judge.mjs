import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-proximity-alert-runtime.json','utf8'))
assert.equal(r.sha,sha);assert.equal(r.result,'PASS');assert.equal(r.environment,'UGO TEST');assert.equal(r.production_touched,false);assert.deepEqual([r.outside_alert_count,r.inside_alert_count],[0,1]);assert.equal(r.inside_reported_radius_km,15);assert.equal(r.cleanup_ok,true)
await fs.writeFile('artifacts/provider-proximity-alert-judge.json',JSON.stringify({readiness_id:r.readiness_id,sha,result:'PASS',checks:['outside-radius-suppressed','inside-radius-delivered-once','reported-radius-matches-provider','cleanup'],checked_at:new Date().toISOString()},null,2)+'\n')
