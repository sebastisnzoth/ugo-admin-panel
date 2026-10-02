import assert from'node:assert/strict'
import fs from'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const runtime=JSON.parse(await fs.readFile('artifacts/provider-workflow-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/provider-workflow-judge.json','utf8'))
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(judge.readiness_id,'provider-workflow','SENTINEL_SCOPE_REQUIRED')
assert.equal(judge.status,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.productionTouched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.equal(runtime.observations.initial_rejection_no_advance,true,'SENTINEL_INITIAL_FAIL_CLOSED')
assert.equal(runtime.observations.final_rejection_no_advance,true,'SENTINEL_FINAL_FAIL_CLOSED')
assert.equal(runtime.observations.invalid_transition_no_mutation,true,'SENTINEL_INVALID_FAIL_CLOSED')
const result={validator:'Sentinel',readiness_id:'provider-workflow',status:'PASS',sha,checks:['same-sha','judge-pass','ugo-test-only','production-untouched','sequential-transitions','evidence-gates','invalid-transition-fail-closed'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-workflow-sentinel.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
