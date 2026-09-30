import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/auto-ledgers-runtime.json','utf8'))
assert.equal(p.readiness_id,'auto-ledgers')
assert.equal(p.environment,'UGO TEST')
assert.equal(p.sha,sha)
assert.equal(p.result,'PASS')
assert.ok(p.autonomous_job_id&&p.correlation_id&&p.decision_id&&p.evidence_id)
for(const [name,value] of Object.entries(p.assertions||{}))assert.equal(value,true,name+' must pass')
const out={validator:'Judge',result:'PASS',readiness_id:'auto-ledgers',sha,correlation_id:p.correlation_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/auto-ledgers-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
