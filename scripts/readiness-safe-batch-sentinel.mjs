import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const runtimePath=process.argv[2]||'artifacts/readiness-safe-batch-runtime.json'
const judgePath=process.argv[3]||'artifacts/readiness-safe-batch-judge.json'
const output=process.argv[4]||'artifacts/readiness-safe-batch-sentinel.json'
const runtime=JSON.parse(await fs.readFile(runtimePath,'utf8'))
const judge=JSON.parse(await fs.readFile(judgePath,'utf8'))

assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(runtime.status,'PASS','RUNTIME_MUST_PASS')
assert.equal(runtime.current_sha_open_incidents,0,'CURRENT_SHA_INCIDENTS_MUST_BE_CLEAR')
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(judge.status,'PASS','SENTINEL_REQUIRES_JUDGE_PASS')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ENV_ONLY')
assert.equal(runtime.production_touched,false,'SENTINEL_PRODUCTION_TOUCH_FORBIDDEN')
assert.ok(runtime.hugo_action?.service_id,'SENTINEL_HUGO_EFFECT_ID_REQUIRED')
assert.equal(runtime.hugo_action?.cleanup_state,'DELETED','SENTINEL_CLEANUP_REQUIRED')
assert.notEqual(String(runtime.hugo_action?.cleanup_state).toLowerCase(),'buscando','SENTINEL_TEST_SERVICE_LEFT_ACTIVE')

const result={
 validator:'Sentinel',
 status:'PASS',
 sha,
 checks:[
   'same-sha-runtime',
   'same-sha-judge',
   'ugo-test-only',
   'production-untouched',
   'hugo-test-side-effect-cleaned',
   'judge-pass'
 ],
 source_artifacts:[runtimePath,judgePath],
 completed_at:new Date().toISOString()
}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
