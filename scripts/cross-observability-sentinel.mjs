import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const auto=JSON.parse(await fs.readFile('artifacts/auto-ledgers-runtime.json','utf8'))
const hugo=JSON.parse(await fs.readFile('artifacts/hugo-audit-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/cross-observability-judge.json','utf8'))

assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA')
assert.equal(judge.result,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(auto.sha,sha,'SENTINEL_AUTO_SAME_SHA')
assert.equal(hugo.sha,sha,'SENTINEL_HUGO_SAME_SHA')
assert.equal(auto.environment,'UGO TEST','SENTINEL_AUTO_TEST_ONLY')
assert.equal(hugo.environment,'UGO TEST','SENTINEL_HUGO_TEST_ONLY')
assert.equal(hugo.production_touched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.ok(auto.autonomous_job_id&&auto.correlation_id,'SENTINEL_JOB_TRACE_REQUIRED')
assert.ok(hugo.service_id&&hugo.correlation_id,'SENTINEL_SERVICE_TRACE_REQUIRED')
assert.ok(judge.job?.decision_id&&judge.job?.evidence_id,'SENTINEL_JOB_LEDGER_REQUIRED')
assert.ok(judge.service?.decision_id&&judge.service?.evidence_id&&judge.service?.audit_log_id,'SENTINEL_SERVICE_LEDGER_REQUIRED')
assert.notEqual(auto.correlation_id,hugo.correlation_id,'SENTINEL_TRACE_ISOLATION_REQUIRED')

const out={
 readiness_id:'cross-observability',
 validator:'Sentinel',
 result:'PASS',
 sha,
 production_touched:false,
 checks:['same-sha','ugo-test-only','job-correlation','service-correlation','decision-ledger','evidence-ledger','audit-log','trace-isolation','judge-pass'],
 completed_at:new Date().toISOString()
}
await fs.writeFile('artifacts/cross-observability-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
