import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const e=JSON.parse(await fs.readFile('artifacts/admin-risk-runtime.json','utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(e.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(e.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(e.actor_role,'superadmin','JUDGE_SUPERADMIN_REQUIRED')
assert.equal(e.result,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
assert.equal(e.production_touched,false,'JUDGE_PRODUCTION_MUST_BE_UNTOUCHED')
assert.ok(e.counts?.evidence>0,'JUDGE_EVIDENCE_LEDGER_REQUIRED')
assert.ok(e.counts?.decisions>0,'JUDGE_DECISION_LEDGER_REQUIRED')
const out={validator:'Judge',readiness_id:'admin-risk',result:'PASS',runtime_sha:sha,checked_at:new Date().toISOString(),basis:['risk/control/challenge counts','findings','release blockers','evidence ledger','decision ledger','safe evidence links']}
await fs.writeFile('artifacts/admin-risk-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
