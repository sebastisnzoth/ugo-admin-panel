import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260929190746_autonomous_exception_recovery_runtime.sql','utf8')
const runtime=fs.readFileSync('scripts/autonomous-exception-recovery-runtime.mjs','utf8')
const judge=fs.readFileSync('scripts/autonomous-exception-recovery-judge.mjs','utf8')
const workerGuard=fs.readFileSync('supabase/migrations/20260930035000_restore_service_role_worker_recovery.sql','utf8')
const statePreservation=fs.readFileSync('supabase/migrations/20260930035500_exception_recovery_preserve_runtime_state.sql','utf8')

test('exception recovery is TEST-only, service-role-only and uses UGO worker recovery',()=>{
  for(const x of['autonomous_execute_exception_recovery','AUTONOMOUS_LEASE_TIMEOUT','autonomous_worker_cycle','autonomous_recovery_audits','EXCEPTION_DETECTED','EXCEPTION_RECOVERY_VERIFICATION'])assert.ok(sql.includes(x),x)
  assert.match(sql,/revoke all on function public\.autonomous_execute_exception_recovery\(uuid\) from public,anon,authenticated/)
  assert.match(sql,/grant execute on function public\.autonomous_execute_exception_recovery\(uuid\) to service_role/)
  assert.match(runtime,/tmossnqfwfwjrtzwcbmm\.supabase\.co/)
  assert.match(runtime,/production_touched/)
})

test('independent judge requires persisted incident, recovery audit, ledgers and safe sentinel state',()=>{
  for(const x of['development_incidents','autonomous_recovery_audits','autonomous_decision_ledger','autonomous_evidence_ledger','audit_log','SENTINEL_STATE_PRESERVATION_FAILED'])assert.ok(judge.includes(x),x)
  assert.match(judge,/manual_sql_state_edit/)
  assert.match(judge,/manual_github_state_edit/)
})


test('trusted server worker remains service-role compatible without opening anon/public execution',()=>{
  for(const x of[
    'autonomous_claim_job',
    'autonomous_recover_stale_jobs',
    "current_setting('request.jwt.claim.role',true)",
    "='service_role'",
    'private.is_superadmin()'
  ])assert.ok(workerGuard.includes(x),x)
  assert.match(workerGuard,/grant execute on function public\.autonomous_claim_job\(text,integer\) to authenticated,service_role/i)
  assert.match(workerGuard,/grant execute on function public\.autonomous_recover_stale_jobs\(\) to authenticated,service_role/i)
  assert.match(workerGuard,/revoke all on function public\.autonomous_claim_job\(text,integer\) from public,anon/i)
  assert.match(workerGuard,/revoke all on function public\.autonomous_recover_stale_jobs\(\) from public,anon/i)
})


test('recovery preserves active autonomy mode and unrelated scoped kill switches',()=>{
  for(const x of[
    'v_previous_mode',
    'v_initial_kills',
    'v_final_kills',
    'RECOVERY_SCOPE_KILL_SWITCH_ACTIVE',
    'UNRELATED_KILL_SWITCH_STATE_CHANGED',
    "'kill_switches_preserved',true",
    "'production_touched',false"
  ])assert.ok(statePreservation.includes(x),x)
  assert.match(runtime,/modePreserved/)
  assert.match(runtime,/kill_switches_preserved/)
  assert.match(judge,/initial_kill_switch_ids/)
  assert.match(judge,/SENTINEL_STATE_PRESERVATION_FAILED/)
})
