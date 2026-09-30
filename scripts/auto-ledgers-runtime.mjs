import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(key&&sha,'UGO_TEST_LEDGER_INPUTS_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const correlationId=crypto.randomUUID()
const idempotency='readiness-auto-ledgers:'+sha+':'+correlationId

await fs.mkdir('artifacts',{recursive:true})
const {data:job,error:jobError}=await db.from('autonomous_jobs').insert({
 department_id:14,
 objective:'Readiness proof for append-only correlated Decision/Evidence Ledgers',
 trigger_type:'READINESS_TEST',
 target_type:'READINESS',
 target_id:'auto-ledgers',
 authority_class:'GREEN',
 status:'SUCCEEDED',
 idempotency_key:idempotency,
 correlation_id:correlationId,
 input_evidence:[{source:'readiness-auto-ledgers',sha}],
 result:{readiness_id:'auto-ledgers',sha,environment:'UGO TEST'},
 started_at:new Date().toISOString(),
 finished_at:new Date().toISOString()
}).select('id,department_id,status,idempotency_key,correlation_id,created_at').single()
assert.ifError(jobError)
assert.equal(job.correlation_id,correlationId)

const reference='readiness://auto-ledgers/'+sha+'/'+correlationId
const {data:evidence,error:evidenceError}=await db.from('autonomous_evidence_ledger').insert({
 job_id:job.id,
 evidence_type:'READINESS_AUTO_LEDGERS',
 reference,
 evidence_hash:crypto.createHash('sha256').update(reference).digest('hex'),
 metadata:{readiness_id:'auto-ledgers',sha,environment:'UGO TEST'},
 correlation_id:correlationId
}).select('id,job_id,evidence_type,reference,evidence_hash,metadata,correlation_id,created_at').single()
assert.ifError(evidenceError)

const {data:decision,error:decisionError}=await db.from('autonomous_decision_ledger').insert({
 job_id:job.id,
 department_id:14,
 agent_id:null,
 decision:'LEDGER_RUNTIME_PROOF_RECORDED',
 reason:'Verify append-only, correlation and queryability in UGO TEST',
 authority_class:'GREEN',
 policy_version:'UGO_FUNCTIONAL_READINESS_V3',
 evidence_refs:[reference],
 authorization_result:'AUTHORIZED_TEST',
 correlation_id:correlationId
}).select('id,job_id,department_id,decision,evidence_refs,authorization_result,correlation_id,created_at').single()
assert.ifError(decisionError)

const {data:queriedEvidence,error:qe}=await db.from('autonomous_evidence_ledger').select('id,job_id,reference,correlation_id').eq('correlation_id',correlationId)
assert.ifError(qe)
const {data:queriedDecision,error:qd}=await db.from('autonomous_decision_ledger').select('id,job_id,decision,evidence_refs,correlation_id').eq('correlation_id',correlationId)
assert.ifError(qd)
assert.equal(queriedEvidence?.length,1,'evidence must be queryable by correlation_id')
assert.equal(queriedDecision?.length,1,'decision must be queryable by correlation_id')
assert.equal(queriedEvidence[0].job_id,job.id)
assert.equal(queriedDecision[0].job_id,job.id)
assert.equal(queriedEvidence[0].correlation_id,correlationId)
assert.equal(queriedDecision[0].correlation_id,correlationId)
assert.ok((queriedDecision[0].evidence_refs||[]).includes(reference),'decision must reference correlated evidence')

const updateDecision=await db.from('autonomous_decision_ledger').update({reason:'MUTATION_SHOULD_FAIL'}).eq('id',decision.id)
const deleteDecision=await db.from('autonomous_decision_ledger').delete().eq('id',decision.id)
const updateEvidence=await db.from('autonomous_evidence_ledger').update({reference:'MUTATION_SHOULD_FAIL'}).eq('id',evidence.id)
const deleteEvidence=await db.from('autonomous_evidence_ledger').delete().eq('id',evidence.id)
for(const [name,result] of Object.entries({updateDecision,deleteDecision,updateEvidence,deleteEvidence})){
 assert.ok(result.error,name+' must be rejected by append-only guard')
 assert.match(String(result.error.message||result.error),/AUTONOMOUS_LEDGER_APPEND_ONLY/)
}

const proof={
 readiness_id:'auto-ledgers',
 task_id:'readiness-auto-ledgers',
 job_id:'UGO-READINESS-AUTO-LEDGERS',
 environment:'UGO TEST',
 sha,
 autonomous_job_id:job.id,
 correlation_id:correlationId,
 decision_id:decision.id,
 evidence_id:evidence.id,
 reference,
 assertions:{
  same_correlation_id:true,
  decision_queryable:true,
  evidence_queryable:true,
  decision_references_evidence:true,
  decision_update_rejected:true,
  decision_delete_rejected:true,
  evidence_update_rejected:true,
  evidence_delete_rejected:true
 },
 result:'PASS',
 completed_at:new Date().toISOString()
}
await fs.writeFile('artifacts/auto-ledgers-runtime.json',JSON.stringify(proof,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,correlationId,jobId:job.id,decisionId:decision.id,evidenceId:evidence.id}))
