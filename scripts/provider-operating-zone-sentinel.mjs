import assert from'node:assert/strict';import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',r=JSON.parse(await fs.readFile('artifacts/provider-operating-zone-runtime.json','utf8')),j=JSON.parse(await fs.readFile('artifacts/provider-operating-zone-judge.json','utf8'))
assert.equal(r.sha,sha);assert.equal(j.sha,sha);assert.equal(j.result,'PASS');assert.equal(r.cleanup_ok,true);assert.equal(r.production_touched,false)
await fs.writeFile('artifacts/provider-operating-zone-sentinel.json',JSON.stringify({readiness_id:r.readiness_id,sha,result:'PASS',production_touched:false,cleanup_ok:true,checked_at:new Date().toISOString()},null,2)+'\n')
