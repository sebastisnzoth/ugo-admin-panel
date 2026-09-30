import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const auto=JSON.parse(await fs.readFile('artifacts/auto-ledgers-runtime.json','utf8'))
const hugo=JSON.parse(await fs.readFile('artifacts/hugo-audit-runtime.json','utf8'))

assert.equal(auto.sha,sha,'AUTO_LEDGER_SAME_SHA_REQUIRED')
assert.equal(hugo.sha,sha,'HUGO_AUDIT_SAME_SHA_REQUIRED')
assert.equal(auto.environment,'UGO TEST','AUTO_LEDGER_TEST_ONLY')
assert.equal(hugo.environment,'UGO TEST','HUGO_AUDIT_TEST_ONLY')
assert.equal(auto.result,'PASS','AUTO_LEDGER_RUNTIME_PASS_REQUIRED')
assert.equal(hugo.status,'PASS','HUGO_AUDIT_RUNTIME_PASS_REQUIRED')
assert.ok(auto.autonomous_job_id&&auto.correlation_id,'JOB_OBSERVABILITY_REQUIRED')
assert.ok(auto.decision_id&&auto.evidence_id,'JOB_LEDGER_IDS_REQUIRED')
assert.equal(auto.assertions?.same_correlation_id,true,'JOB_CORRELATION_REQUIRED')
assert.equal(auto.assertions?.decision_references_evidence,true,'JOB_EVIDENCE_LINK_REQUIRED')
assert.ok(hugo.service_id&&hugo.correlation_id,'SERVICE_OBSERVABILITY_REQUIRED')
assert.ok(hugo.trace?.audit?.decision_id&&hugo.trace?.audit?.evidence_id&&hugo.trace?.audit?.audit_log_id,'SERVICE_LEDGER_AUDIT_REQUIRED')
assert.equal(hugo.ledgers?.decision?.correlation_id,hugo.correlation_id,'SERVICE_DECISION_CORRELATION_REQUIRED')
assert.equal(hugo.ledgers?.evidence?.correlation_id,hugo.correlation_id,'SERVICE_EVIDENCE_CORRELATION_REQUIRED')
assert.equal(hugo.trace?.response?.audit_status,'PERSISTED','SERVICE_AUDIT_RESPONSE_REQUIRED')
assert.equal(hugo.production_touched,false,'PRODUCTION_UNTOUCHED')

const out={
 readiness_id:'cross-observability',
 validator:'Judge',
 result:'PASS',
 sha,
 environment:'UGO TEST',
 production_touched:false,
 job:{id:auto.autonomous_job_id,correlation_id:auto.correlation_id,decision_id:auto.decision_id,evidence_id:auto.evidence_id},
 service:{id:hugo.service_id,correlation_id:hugo.correlation_id,decision_id:hugo.trace.audit.decision_id,evidence_id:hugo.trace.audit.evidence_id,audit_log_id:hugo.trace.audit.audit_log_id},
 basis:['job queryable by job_id + correlation_id','service queryable by serviceId + correlation_id','Decision/Evidence ledgers correlated','audit_log correlated','same-SHA TEST-only proof'],
 completed_at:new Date().toISOString()
}
await fs.writeFile('artifacts/cross-observability-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
