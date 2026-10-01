import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/provider-evidence-runtime.json'
const output=process.argv[3]||'artifacts/provider-evidence-judge.json'
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const runtime=JSON.parse(await fs.readFile(input,'utf8'))
assert.equal(runtime.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(runtime.readiness_id,'provider-evidence','JUDGE_SCOPE_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(runtime.productionTouched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(runtime.persistedRowsAndBytes,true,'JUDGE_ROWS_BYTES_REQUIRED')
assert.equal(runtime.initialEvidence,true,'JUDGE_INITIAL_REQUIRED')
assert.equal(runtime.finalEvidence,true,'JUDGE_FINAL_REQUIRED')
assert.equal(runtime.stateGuardContract,true,'JUDGE_STAGE_GUARD_REQUIRED')
assert.equal(runtime.uiFlowContract,true,'JUDGE_UI_FLOW_REQUIRED')
assert.equal(runtime.privateBucket,true,'JUDGE_PRIVATE_BUCKET_REQUIRED')
assert.equal(runtime.publicAccessDenied,true,'JUDGE_PUBLIC_DENIED_REQUIRED')
assert.ok(Number(runtime.beforeBytes)>0&&Number(runtime.afterBytes)>0,'JUDGE_NONEMPTY_BYTES_REQUIRED')
assert.ok(runtime.serviceId&&runtime.qaJobId,'JUDGE_AUDIT_IDS_REQUIRED')
assert.equal(runtime.coverage,'COVERED','JUDGE_COVERAGE_REQUIRED')
const result={validator:'Judge',readiness_id:'provider-evidence',status:'PASS',sha,serviceId:runtime.serviceId,qaJobId:runtime.qaJobId,checks:['same-sha','ugo-test-only','rows-and-bytes','initial-and-final','stage-guard','ui-flow','private-storage'],completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
