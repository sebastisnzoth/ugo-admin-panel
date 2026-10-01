import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/hugo-request-continuity-runtime.json','utf8')),j=JSON.parse(await fs.readFile('artifacts/hugo-request-continuity-judge.json','utf8'))
assert.equal(r.sha,sha);assert.equal(j.sha,sha);assert.equal(j.result,'PASS');assert.equal(r.production_touched,false);assert.equal(r.reload_preserved,true);assert.equal(r.ready_for_confirmation,true)
await fs.writeFile('artifacts/hugo-request-continuity-sentinel.json',JSON.stringify({readiness_id:r.readiness_id,sha,result:'PASS',production_touched:false,checked_at:new Date().toISOString()},null,2)+'\n')
