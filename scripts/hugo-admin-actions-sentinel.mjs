import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/hugo-admin-actions-runtime.json','utf8')),j=JSON.parse(await fs.readFile('artifacts/hugo-admin-actions-judge.json','utf8'))
assert.equal(r.sha,sha);assert.equal(j.sha,sha);assert.equal(j.result,'PASS');assert.equal(r.production_touched,false);assert.equal(r.service_state_unchanged,true)
await fs.writeFile('artifacts/hugo-admin-actions-sentinel.json',JSON.stringify({readiness_id:r.readiness_id,sha,result:'PASS',production_touched:false,human_final:'PENDING',checked_at:new Date().toISOString()},null,2)+'\n')
