import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260929143000_qa_independent_runtime_evidence_judge.sql','utf8')
const binding=fs.readFileSync('supabase/migrations/20260929144500_qa_evidence_service_binding.sql','utf8')
const gpsClaimFix=fs.readFileSync('supabase/migrations/20260929150000_qa_gps_service_role_claim_compat.sql','utf8')
const p0ClaimFix=fs.readFileSync('supabase/migrations/20260929151500_qa_p0_harness_secret_key_compat.sql','utf8')

test('upstream P0 harness keeps the GPS negative path and service role ACL without legacy claim gate',()=>{
 assert.doesNotMatch(p0ClaimFix,/if initial_role<>'service_role'/)
 assert.match(p0ClaimFix,/revoke all on function public\.autonomous_qa_run_p0_test_service\(\) from public,anon,authenticated/)
 assert.match(p0ClaimFix,/grant execute on function public\.autonomous_qa_run_p0_test_service\(\) to service_role/)
 for(const assertion of ['P0_ZERO_GPS_ACCEPTED','P0_STALE_GPS_ACCEPTED','P0_INACCURATE_GPS_ACCEPTED','P0_OUTSIDE_GEOFENCE_NOT_REJECTED','P0_REJECTED_ARRIVAL_CHANGED_STATE','P0_ARRIVAL_FAILED']) assert.ok(p0ClaimFix.includes(assertion))
})

test('GPS worker accepts secret-key service_role without exposing the RPC to other roles',()=>{
 assert.doesNotMatch(gpsClaimFix,/request\.jwt\.claim\.role|auth\.jwt\(\)/)
 assert.match(gpsClaimFix,/revoke all on function public\.autonomous_qa_run_gps_independent_evidence\(\) from public,anon,authenticated/)
 assert.match(gpsClaimFix,/grant execute on function public\.autonomous_qa_run_gps_independent_evidence\(\) to service_role/)
 assert.match(gpsClaimFix,/autonomous_record_independent_qa_evidence/)
 assert.match(gpsClaimFix,/autonomous_judge_independent_runtime_coverage/)
})

test('a QA run cannot borrow evidence from a different service or scenario',()=>{
 assert.match(binding,/new\.scenario_id is distinct from run_scenario/)
 assert.match(binding,/new\.service_id is distinct from bound_service/)
 assert.match(binding,/qa_evidence_service_binding before insert or update/)
 assert.match(binding,/QA_EVIDENCE_SERVICE_MISMATCH/)
})

test('reassigning a QA scenario removes its old coverage before another verdict',()=>{
 assert.match(binding,/old\.service_id is distinct from new\.service_id/)
 assert.match(binding,/set status='UNCOVERED',last_run_id=null/)
 assert.match(binding,/qa_scenario_rebind_invalidates_coverage after update of service_id/)
 assert.match(binding,/QA_COVERAGE_SERVICE_MISMATCH/)
})

test('independent runtime coverage requires persisted evidence and deterministic judge',()=>{
 assert.match(migration,/autonomous_qa_assertion_evidence/)
 assert.match(migration,/evidence_hash/)
 assert.match(migration,/INDEPENDENT_EVIDENCE_INCOMPLETE/)
 assert.match(migration,/qa-independent:/)
 assert.match(migration,/INDEPENDENT_PERSISTED_EVIDENCE/)
})

test('physical and human coverage remains fail closed',()=>{
 for(const key of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance']){
  assert.match(migration,new RegExp(key))
 }
 assert.match(migration,/coverage_key=any\(protected\).*status<>'UNCOVERED'/s)
})

test('independent coverage cannot be promoted by external observation alone',()=>{
 assert.match(migration,/exists\(select 1 from public\.autonomous_jobs aj/)
 assert.match(migration,/aj\.verification_result->>'source'='INDEPENDENT_PERSISTED_EVIDENCE'/)
 assert.doesNotMatch(migration,/p_observations/)
})

test('test environment is enforced by persisted service binding',()=>{
 assert.match(migration,/ambiente='demo'/)
 assert.match(migration,/UGO_TEST_SERVICE_REQUIRED/)
})

test('RLS proof remains authenticated-user evidence, not service-role substitution',()=>{
 const auth=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')
 assert.match(auth,/signInWithPassword/)
 assert.match(auth,/client_governance_denied:true/)
 assert.match(auth,/admin_governance_denied:true/)
 assert.match(auth,/provider_cannot_act_as_client:true/)
})

test('realtime proof uses channel subscription and not polling',()=>{
 const rt=fs.readFileSync('scripts/chat-realtime-probe.mjs','utf8')
 assert.match(rt,/\.channel\(/)
 assert.match(rt,/postgres_changes/)
 assert.match(rt,/event_received:true/)
 assert.doesNotMatch(rt,/setInterval\(/)
})

test('no physical or customer coverage can be certified by this migration',()=>{
 assert.doesNotMatch(migration,/qa-independent:physical-gps-device/)
 assert.doesNotMatch(migration,/qa-independent:uploaded-media-bytes/)
 assert.doesNotMatch(migration,/qa-independent:real-customer-acceptance/)
})


test('independent judge owns promotion and writes both evidence and decision ledgers',()=>{
 assert.match(migration,/status not in\('BLOCKED','PASSED'\)/)
 assert.match(migration,/set status='PASSED',judge_result=verification/)
 assert.match(migration,/autonomous_evidence_ledger/)
 assert.match(migration,/autonomous_decision_ledger/)
 assert.match(migration,/QA_INDEPENDENT_JUDGE_PASSED/)
})

test('realtime cleanup is observed only after channel removal and judge is executed',()=>{
 const rt=fs.readFileSync('scripts/chat-realtime-probe.mjs','utf8')
 assert.match(rt,/await receiver\.removeChannel\(channel\)[\s\S]*cleanupCompleted = true/)
 assert.match(rt,/cleanup_completed:clientToProvider\.cleanupCompleted&&providerToClient\.cleanupCompleted/)
 assert.match(rt,/autonomous_judge_independent_runtime_coverage.*realtime/s)
})

test('GPS runtime invokes the complete persisted independent lifecycle judge',()=>{
 const gps=fs.readFileSync('scripts/autonomous-qa-gps-runtime.mjs','utf8')
 assert.match(gps,/autonomous_qa_run_gps_independent_evidence/)
 assert.match(gps,/judgeJob\?\.status,'SUCCEEDED'/)
})


test('authenticated role proof covers the complete configured privilege boundary',()=>{
 const auth=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')
 for(const assertion of ['admin_governance_denied','superadmin_governance_allowed','provider_cannot_act_as_client']) assert.match(auth,new RegExp(assertion+':true'))
 assert.match(auth,/allowedSuperadminGov/)
})


test('fail-closed regression matrix protects all nine forbidden certification shortcuts',()=>{
 const rt=fs.readFileSync('scripts/chat-realtime-probe.mjs','utf8')
 const auth=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')
 assert.match(migration,/INDEPENDENT_EVIDENCE_INCOMPLETE/)
 assert.match(migration,/bad_hash/)
 assert.match(migration,/evidence_hash<>encode\(extensions\.digest/)
 assert.match(migration,/qa-independent:/)
 assert.match(auth,/signInWithPassword/)
 assert.doesNotMatch(rt,/setInterval\(/)
 assert.match(migration,/protected text\[\]:=array\['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'\]/)
 assert.doesNotMatch(migration,/qa-independent:physical-gps-device/)
 assert.doesNotMatch(migration,/qa-independent:uploaded-media-bytes/)
 assert.doesNotMatch(migration,/qa-independent:real-customer-acceptance/)
})


test('GPS independent QA run writes only columns present in autonomous_qa_runs',()=>{
 const gpsFn=migration.slice(migration.indexOf('autonomous_qa_run_gps_independent_evidence'))
 assert.match(gpsFn,/insert into public\.autonomous_qa_runs\(scenario_id,correlation_id,status,simulator_results,judge_result,started_at,finished_at\)/)
 assert.doesNotMatch(gpsFn,/autonomous_qa_runs\(scenario_id,service_id/)
 assert.match(gpsFn,/'BLOCKED'/)
})


test('realtime independent evidence uses isolated non-refreshing privileged clients',()=>{
 const rt=fs.readFileSync('scripts/chat-realtime-probe.mjs','utf8')
 assert.match(rt,/const privilegedClient=\(\)=>createClient/)
 assert.match(rt,/autoRefreshToken:false/)
 assert.match(rt,/detectSessionInUrl:false/)
 assert.match(rt,/await privilegedClient\(\)\.rpc\('autonomous_record_independent_qa_evidence'/)
 assert.match(rt,/await privilegedClient\(\)\.rpc\('autonomous_judge_independent_runtime_coverage'/)
})


test('independent judge authorization relies on explicit service_role EXECUTE grant, not legacy JWT claim shape',()=>{
 const judgeStart=migration.indexOf('create or replace function public.autonomous_judge_independent_runtime_coverage')
 const judgeEnd=migration.indexOf('revoke all on function public.autonomous_judge_independent_runtime_coverage',judgeStart)
 const judge=migration.slice(judgeStart,judgeEnd)
 assert.doesNotMatch(judge,/current_setting\('request\.jwt\.claim\.role'/)
 assert.match(migration,/revoke all on function public\.autonomous_judge_independent_runtime_coverage\(text\) from public,anon,authenticated/)
 assert.match(migration,/grant execute on function public\.autonomous_judge_independent_runtime_coverage\(text\) to service_role/)
})
