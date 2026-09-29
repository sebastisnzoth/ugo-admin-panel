import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260929143000_qa_independent_runtime_evidence_judge.sql','utf8')

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
