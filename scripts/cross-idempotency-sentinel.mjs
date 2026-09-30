import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const runtimePath=process.argv[2]||'artifacts/readiness-cross-idempotency-runtime.json'
const judgePath=process.argv[3]||'artifacts/readiness-cross-idempotency-judge.json'
const output=process.argv[4]||'artifacts/readiness-cross-idempotency-sentinel.json'
const runtime=JSON.parse(await fs.readFile(runtimePath,'utf8'))
const judge=JSON.parse(await fs.readFile(judgePath,'utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(judge.result,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.status,'PASS','SENTINEL_RUNTIME_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.production_touched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.equal(runtime.cleanup_ok,true,'SENTINEL_FIXTURE_CLEANUP_REQUIRED')
assert.equal(runtime.acceptance?.accepted_offer_rows,1,'SENTINEL_NO_DOUBLE_ACCEPTANCE')
assert.equal(runtime.payment_close?.payment_rows,1,'SENTINEL_NO_DOUBLE_PAYMENT')
assert.equal(runtime.payment_close?.audit_rows,1,'SENTINEL_NO_DOUBLE_CLOSE_AUDIT')
assert.equal(runtime.rating?.persisted_rows,2,'SENTINEL_ONE_RATING_PER_ACTOR')
const result={validator:'Sentinel',result:'PASS',status:'PASS',sha,readiness_id:'cross-idempotency',completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
