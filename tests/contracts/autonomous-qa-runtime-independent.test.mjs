import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const runtime=fs.readFileSync('scripts/autonomous-qa-runtime.mjs','utf8')
test('protected QA coverage requires independent judge job and both ledgers',()=>{
 assert.match(runtime,/QA_INDEPENDENT_JUDGE/)
 assert.match(runtime,/QA_INDEPENDENT_JUDGE_REQUIRED/)
 assert.match(runtime,/autonomous_evidence_ledger/)
 assert.match(runtime,/autonomous_decision_ledger/)
 assert.match(runtime,/QA_INDEPENDENT_LEDGER_REQUIRED/)
 assert.doesNotMatch(runtime,/QA_EXTERNAL_OBSERVATION_INCORRECTLY_GREEN/)
})
