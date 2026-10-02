import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-profile-photo-runtime.json','utf8'))
assert.equal(r.sha,sha);assert.equal(r.result,'PASS');assert.equal(r.environment,'UGO TEST');assert.equal(r.production_touched,false);assert.equal(r.db_persisted,true);assert.equal(r.public_fetch_status,200);assert.match(r.content_type||'',/image\/png/);assert.equal(r.cleanup_ok,true)
await fs.writeFile('artifacts/provider-profile-photo-judge.json',JSON.stringify({readiness_id:r.readiness_id,sha,result:'PASS',checks:['storage-upload','profile-path-persisted','public-fetch','cleanup'],checked_at:new Date().toISOString()},null,2)+'\n')
