import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const runtime=JSON.parse(await fs.readFile(process.argv[2]||'artifacts/hugo-continuity-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile(process.argv[3]||'artifacts/hugo-continuity-judge.json','utf8'))
const output=process.argv[4]||'artifacts/hugo-continuity-sentinel.json'
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA')
assert.equal(judge.status,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.production_touched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.ok(runtime.session?.turns>=6,'SENTINEL_MULTI_TURN_REQUIRED')
assert.equal(runtime.session?.ordered,true,'SENTINEL_CONTEXT_ORDER_REQUIRED')
assert.ok(runtime.correlation_id,'SENTINEL_CORRELATION_REQUIRED')
const out={validator:'Sentinel',status:'PASS',sha,correlation_id:runtime.correlation_id,checks:['same-sha','ugo-test-only','production-untouched','multi-turn','context-order','judge-pass'],completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
