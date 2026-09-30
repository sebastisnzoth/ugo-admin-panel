import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-history-runtime.json','utf8'))
assert.equal(p.readiness_id,'client-history')
assert.equal(p.environment,'UGO TEST')
assert.equal(p.sha,sha)
assert.equal(p.result,'PASS')
assert.ok(p.service_id)
assert.ok(p.backend?.payment)
assert.ok(Number(p.backend?.client_rating)>=1)
assert.ok(Number(p.backend?.provider_rating)>=1)
assert.ok(Number(p.backend?.evidence_count)>0)
for(const [name,value] of Object.entries(p.assertions||{}))assert.equal(value,true,name+' must pass')
assert.deepEqual(p.page_errors,[])
const out={validator:'Judge',result:'PASS',readiness_id:'client-history',sha,service_id:p.service_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-history-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
