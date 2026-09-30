import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/hugo-continuity-runtime.json'
const output=process.argv[3]||'artifacts/hugo-continuity-judge.json'
const r=JSON.parse(await fs.readFile(input,'utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(r.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(r.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(r.production_touched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(r.status,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
assert.ok(r.session?.turns>=6,'JUDGE_MULTI_TURN_REQUIRED')
assert.equal(r.session?.history_limit,8,'JUDGE_HISTORY_LIMIT_REQUIRED')
assert.equal(r.session?.ordered,true,'JUDGE_ORDER_REQUIRED')
assert.equal(r.session?.retained_first_fact,'servicio 50','JUDGE_CONTEXT_RETENTION_REQUIRED')
for(const check of['live-ref-not-stale-closure','bounded-8-turn-history','stable-role-mapping','history-before-current-turn','multi-turn-fact-retained'])assert.ok(r.checks?.includes(check),`JUDGE_CHECK_MISSING_${check}`)
const out={validator:'Judge',status:'PASS',sha,correlation_id:r.correlation_id,basis:'UGO TEST multi-turn session retains ordered bounded context from live message state',completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
