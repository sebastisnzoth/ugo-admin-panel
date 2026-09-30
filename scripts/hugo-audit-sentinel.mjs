import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const runtime=JSON.parse(await fs.readFile(process.argv[2]||'artifacts/hugo-audit-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile(process.argv[3]||'artifacts/hugo-audit-judge.json','utf8'))
const output=process.argv[4]||'artifacts/hugo-audit-sentinel.json'
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA')
assert.equal(judge.status,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.production_touched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.equal(runtime.trace?.authority,'ALLOW','SENTINEL_AUTHORITY_REQUIRED')
assert.equal(runtime.trace?.response?.audit_status,'PERSISTED','SENTINEL_AUDIT_RESPONSE_REQUIRED')
assert.ok(runtime.correlation_id&&runtime.trace?.audit?.decision_id&&runtime.trace?.audit?.evidence_id&&runtime.trace?.audit?.audit_log_id,'SENTINEL_CORRELATED_LEDGER_IDS_REQUIRED')
const out={validator:'Sentinel',status:'PASS',sha,correlation_id:runtime.correlation_id,checks:['same-sha','ugo-test-only','production-untouched','authority-allow','effect-persisted','decision-ledger','evidence-ledger','audit-log','response-correlated','judge-pass'],completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
