import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/hugo-audit-runtime.json'
const output=process.argv[3]||'artifacts/hugo-audit-judge.json'
const r=JSON.parse(await fs.readFile(input,'utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(r.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(r.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(r.production_touched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(r.status,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
for(const stage of['intent','authority','action','effect','audit','response'])assert.ok(r.trace?.[stage],`JUDGE_STAGE_MISSING_${stage}`)
assert.ok(r.correlation_id,'JUDGE_CORRELATION_REQUIRED')
assert.ok(r.trace.audit?.decision_id&&r.trace.audit?.evidence_id&&r.trace.audit?.audit_log_id,'JUDGE_LEDGERS_REQUIRED')
assert.equal(r.ledgers?.decision?.correlation_id,r.correlation_id)
assert.equal(r.ledgers?.evidence?.correlation_id,r.correlation_id)
assert.equal(r.trace.response?.audit_status,'PERSISTED')
const out={validator:'Judge',status:'PASS',sha,correlation_id:r.correlation_id,basis:'INTENT→AUTHORITY→ACTION→EFFECT→AUDIT→RESPONSE persisted with correlated ledgers',completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
