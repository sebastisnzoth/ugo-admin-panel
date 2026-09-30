import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const proof=JSON.parse(await fs.readFile('artifacts/client-camera-runtime.json','utf8'))
assert.equal(proof.readiness_id,'client-camera')
assert.equal(proof.task_id,'readiness-client-camera')
assert.equal(proof.environment,'UGO TEST')
assert.equal(proof.sha,sha,'same-SHA runtime evidence required')
assert.equal(proof.result,'PASS')
assert.ok(proof.draft_id)
assert.ok(proof.evidence_id)
assert.ok(proof.storage_path)
assert.ok(Number(proof.storage_bytes)>0)
for(const [name,value] of Object.entries(proof.assertions||{}))assert.equal(value,true,name+' must pass')
assert.deepEqual(proof.page_errors,[])
const out={validator:'Judge',result:'PASS',readiness_id:'client-camera',sha,hardware_final_required:Boolean(proof.hardware_final_required),checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-camera-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
