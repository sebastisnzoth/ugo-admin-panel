import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/readiness-cross-idempotency-runtime.json'
const output=process.argv[3]||'artifacts/readiness-cross-idempotency-judge.json'
const runtime=JSON.parse(await fs.readFile(input,'utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(runtime.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(runtime.readiness_id,'cross-idempotency','JUDGE_WRONG_READINESS')
assert.equal(runtime.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(runtime.production_touched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(runtime.status,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
assert.equal(runtime.cleanup_ok,true,'JUDGE_CLEANUP_REQUIRED')
assert.deepEqual([runtime.acceptance?.successful_calls,runtime.acceptance?.service_rows,runtime.acceptance?.accepted_offer_rows],[2,1,1],'JUDGE_ACCEPTANCE_MUST_CONVERGE')
assert.deepEqual([runtime.payment_close?.successful_calls,runtime.payment_close?.service_rows,runtime.payment_close?.payment_rows,runtime.payment_close?.debt_rows,runtime.payment_close?.audit_rows],[2,1,1,1,1],'JUDGE_PAYMENT_CLOSE_MUST_CONVERGE')
assert.equal(runtime.payment_close?.service_state,'completado')
assert.equal(runtime.payment_close?.payment_state,'liberado')
for(const side of ['client','provider']){
  assert.equal(runtime.rating?.[side]?.successful_calls,1,side+'_RATING_ONE_SUCCESS')
  assert.equal(runtime.rating?.[side]?.conflict_calls,1,side+'_RATING_ONE_CONFLICT')
  assert.equal(runtime.rating?.[side]?.conflict_code,'23505',side+'_RATING_DB_UNIQUENESS_REQUIRED')
}
assert.equal(runtime.rating?.persisted_rows,2,'JUDGE_ONE_RATING_PER_ACTOR_REQUIRED')
const result={validator:'Judge',result:'PASS',status:'PASS',sha,readiness_id:'cross-idempotency',completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
