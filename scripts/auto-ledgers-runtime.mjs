import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(key&&sha,'UGO_TEST_LEDGER_INPUTS_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
await fs.mkdir('artifacts',{recursive:true})

const {data:job,error:jobError}=await db.rpc('autonomous_reconcile_quality_coverage')
assert.ifError(jobError)
assert.equal(job.status,'SUCCEEDED')
assert.ok(job.id&&job.correlation_id,'correlated autonomous job required')

const [{data:decisions,error:de},{data:evidence,error:ee}]=await Promise.all([
 db.from('autonomous_decision_ledger').select('id,job_id,decision,evidence_refs,correlation_id,created_at').eq('job_id',job.id).eq('correlation_id',job.correlation_id),
 db.from('autonomous_evidence_ledger').select('id,job_id,evidence_type,reference,evidence_hash,correlation_id,created_at').eq('job_id',job.id).eq('correlation_id',job.correlation_id)
])
assert.ifError(de);assert.ifError(ee)
assert.ok(decisions?.length,'decision ledger row required')
assert.ok(evidence?.length,'evidence ledger row required')
const decision=decisions[0],proofEvidence=evidence[0]
assert.equal(decision.job_id,job.id)
assert.equal(proofEvidence.job_id,job.id)
assert.equal(decision.correlation_id,job.correlation_id)
assert.equal(proofEvidence.correlation_id,job.correlation_id)
assert.ok((decision.evidence_refs||[]).includes(proofEvidence.reference),'decision must reference correlated evidence')

const mutationResults={
 decision_update:await db.from('autonomous_decision_ledger').update({reason:'MUTATION_SHOULD_FAIL'}).eq('id',decision.id),
 decision_delete:await db.from('autonomous_decision_ledger').delete().eq('id',decision.id),
 evidence_update:await db.from('autonomous_evidence_ledger').update({reference:'MUTATION_SHOULD_FAIL'}).eq('id',proofEvidence.id),
 evidence_delete:await db.from('autonomous_evidence_ledger').delete().eq('id',proofEvidence.id)
}
for(const [name,result] of Object.entries(mutationResults)){
 assert.ok(result.error,name+' must be rejected')
 assert.match(String(result.error.message||result.error),/AUTONOMOUS_LEDGER_APPEND_ONLY|permission denied/i,name+' must be blocked by immutable ledger boundary')
}

const proof={
 readiness_id:'auto-ledgers',
 task_id:'readiness-auto-ledgers',
 job_id:'UGO-READINESS-AUTO-LEDGERS',
 environment:'UGO TEST',
 sha,
 autonomous_job_id:job.id,
 correlation_id:job.correlation_id,
 decision_id:decision.id,
 evidence_id:proofEvidence.id,
 reference:proofEvidence.reference,
 mutation_errors:Object.fromEntries(Object.entries(mutationResults).map(([name,result])=>[name,String(result.error?.message||result.error)])),
 assertions:{
  append_path_succeeded:true,
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
console.log(JSON.stringify({status:'PASS',sha,correlationId:job.correlation_id,jobId:job.id,decisionId:decision.id,evidenceId:proofEvidence.id}))
