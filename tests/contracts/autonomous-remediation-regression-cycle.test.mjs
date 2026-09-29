import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const sql=fs.readFileSync('supabase/migrations/20260929193000_remediation_regression_cycle.sql','utf8')
const runtime=fs.readFileSync('scripts/autonomous-remediation-regression-runtime.mjs','utf8')
const judge=fs.readFileSync('scripts/autonomous-remediation-regression-judge.mjs','utf8')
test('remediation regression cycle is service-role-only and persists one correlation chain',()=>{
 for(const x of['autonomous_execute_remediation_regression','CONTROLLED_FAILURE_NOT_DETECTED','REMEDIATION_RERUN_NOT_PASSING','permanent_regression=true','QA_REMEDIATION_REGRESSION','correlation_id'])assert.ok(sql.includes(x),x)
 assert.match(sql,/revoke all on function public\.autonomous_execute_remediation_regression\(uuid\) from public,anon,authenticated/)
 assert.match(sql,/grant execute on function public\.autonomous_execute_remediation_regression\(uuid\) to service_role/)
})
test('executor and independent judge enforce TEST and persisted failure-remediation-rerun evidence',()=>{
 assert.match(runtime,/UGO_TEST_SERVICE_ROLE_REQUIRED/)
 assert.match(runtime,/initial_failure!=='DETECTED'/)
 assert.match(judge,/f\.status!=='FAILED'/)
 assert.match(judge,/p\.status!=='PASSED'/)
 assert.match(judge,/p\.permanent_regression!==true/)
 assert.match(judge,/REMEDIATION_CORRELATION_MISMATCH/)
})
