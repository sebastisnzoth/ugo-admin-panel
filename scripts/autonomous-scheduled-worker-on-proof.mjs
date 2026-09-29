import assert from'node:assert/strict'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=String(process.env.GITHUB_SHA||'').trim()
const runId=String(process.env.GITHUB_RUN_ID||'local')
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
if(!/^[0-9a-f]{40}$/.test(sha))throw new Error('VALID_GITHUB_SHA_REQUIRED')

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const one=async(q,label)=>{const{data,error}=await q;if(error)throw new Error(label+': '+error.message);return data}
const reason='Scheduled worker ON proof '+sha
let switchedOn=false

try{
 const state=await one(db.from('autonomous_company_state').select('mode').eq('singleton',true).single(),'initial state')
 assert.equal(state.mode,'OFF','scheduled proof requires safe OFF initial state')
 const{count:running,error:runningError}=await db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING')
 if(runningError)throw runningError
 assert.equal(running,0,'scheduled proof requires zero RUNNING jobs')
 const{count:kills,error:killsError}=await db.from('autonomous_kill_switches').select('id',{count:'exact',head:true}).eq('enabled',true)
 if(killsError)throw killsError
 assert.equal(kills,0,'scheduled proof requires zero active kill switches')

 const cap=await one(db.from('autonomous_capability_registry').select('capability_key,department_id,authority_class,enabled').eq('capability_key','qa.green.echo').single(),'GREEN capability')
 assert.equal(cap.enabled,true)
 assert.equal(cap.authority_class,'GREEN')
 const agent=await one(db.from('autonomous_agents').select('id,department_id,authority_class,status').eq('agent_key','quality-coverage-agent').single(),'GREEN agent')
 assert.equal(agent.department_id,cap.department_id)
 assert.equal(agent.authority_class,'GREEN')
 assert.notEqual(agent.status,'DISABLED')

 const idem='scheduled-worker-on-proof:'+sha
 let job=await one(db.from('autonomous_jobs').select('*').eq('idempotency_key',idem).maybeSingle(),'existing proof job')
 if(!job){
  job=await one(db.from('autonomous_jobs').insert({
   department_id:cap.department_id,
   agent_id:agent.id,
   objective:'Browser-independent scheduled worker ON-mode proof for '+sha,
   trigger_type:'SCHEDULED_TEST',
   target_type:'UGO_TEST_WORKER',
   target_id:sha,
   authority_class:'GREEN',
   status:'QUEUED',
   idempotency_key:idem,
   input_evidence:[{message:'UGO scheduled worker ON proof '+sha,source_sha:sha,run_id:runId}],
   data_quality_status:'TRUSTED',
   data_quality_assessment:{freshness:true,provenance:true,completeness:true,consistency:true,source:'UGO_TEST_SCHEDULED_WORKER_PROOF',source_sha:sha},
   capability:'qa.green.echo',
   estimated_cost:0
  }).select('*').single(),'insert proof job')
 }

 if(job.status!=='SUCCEEDED'){
  assert.equal(job.status,'QUEUED','proof job must be QUEUED or already SUCCEEDED')
  await one(db.from('autonomous_company_state').update({mode:'ON',reason}).eq('singleton',true).select('mode').single(),'enable autonomy')
  switchedOn=true
  const cycle=await one(db.rpc('autonomous_worker_cycle',{p_worker:'github-actions-scheduled-worker-'+runId,p_limit:50}),'worker cycle')
  if(!Array.isArray(cycle)||!cycle.some(x=>x.job_id===job.id&&x.status==='SUCCEEDED'))throw new Error('TARGET_GREEN_JOB_NOT_COMPLETED')
 }
 job=await one(db.from('autonomous_jobs').select('id,status,authority_class,capability,correlation_id,attempt_count,authorization_decision,verification_result,finished_at').eq('id',job.id).single(),'completed proof job')
 assert.equal(job.status,'SUCCEEDED')
 assert.equal(job.authority_class,'GREEN')
 assert.equal(job.capability,'qa.green.echo')
 assert.equal(job.authorization_decision,'AUTHORIZED_POLICY')
 assert.equal(job.verification_result?.passed,true)

 const decisions=await one(db.from('autonomous_decision_ledger').select('id,decision,authorization_result,correlation_id,evidence_refs').eq('job_id',job.id),'decision ledger')
 const evidence=await one(db.from('autonomous_evidence_ledger').select('id,evidence_type,reference,evidence_hash,correlation_id').eq('job_id',job.id),'evidence ledger')
 assert.ok(decisions.some(x=>x.decision==='WORKER_EXECUTED'&&x.authorization_result==='AUTHORIZED'&&x.correlation_id===job.correlation_id),'correlated Decision Ledger required')
 assert.ok(evidence.some(x=>x.evidence_type==='CAPABILITY_VERIFICATION'&&x.correlation_id===job.correlation_id&&x.evidence_hash),'correlated Evidence Ledger required')

 console.log(JSON.stringify({scheduledWorkerOnProof:true,sourceSha:sha,jobId:job.id,status:job.status,correlationId:job.correlation_id,decisionLedger:decisions.length,evidenceLedger:evidence.length,verificationPassed:true}))
}finally{
 if(switchedOn){
  const current=await one(db.from('autonomous_company_state').select('mode,reason').eq('singleton',true).single(),'cleanup state')
  if(current.mode==='ON'&&current.reason===reason){
   await one(db.from('autonomous_company_state').update({mode:'OFF',reason:'Scheduled worker ON proof complete; safe OFF restored for '+sha}).eq('singleton',true).select('mode').single(),'restore OFF')
  }
 }
 const safe=await one(db.from('autonomous_company_state').select('mode').eq('singleton',true).single(),'final state')
 if(safe.mode!=='OFF')throw new Error('SAFE_OFF_NOT_RESTORED mode='+safe.mode)
 const{count:running,error}=await db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING')
 if(error)throw error
 if(running)throw new Error('RUNNING_JOBS_REMAIN count='+running)
}
