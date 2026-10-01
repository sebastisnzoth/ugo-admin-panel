import assert from'node:assert/strict'
import fs from'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const runtime=JSON.parse(await fs.readFile('artifacts/provider-workflow-runtime.json','utf8'))
assert.equal(runtime.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(runtime.readiness_id,'provider-workflow','JUDGE_SCOPE_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(runtime.productionTouched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(runtime.result,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
assert.ok(runtime.serviceId,'JUDGE_SERVICE_ID_REQUIRED')
for(const key of ['initial_evidence_required','initial_rejection_no_advance','start_persisted','final_evidence_required','final_rejection_no_advance','finish_persisted','backward_transition_rejected','invalid_transition_no_mutation']){
  assert.equal(runtime.observations?.[key],true,'JUDGE_'+key)
}
assert.deepEqual(runtime.states,['llegado','en_progreso','esperando_aprobacion'])
const result={validator:'Judge',readiness_id:'provider-workflow',status:'PASS',sha,serviceId:runtime.serviceId,checks:Object.keys(runtime.observations),completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-workflow-judge.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
