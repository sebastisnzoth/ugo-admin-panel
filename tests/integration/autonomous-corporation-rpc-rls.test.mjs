import test from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const enabled=Boolean(url&&anon&&email&&password&&serviceKey)
const sb=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const privileged=()=>createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})

test('Autonomous Company isolated UGO TEST control plane', {skip:!enabled}, async()=>{
 assert.ok(url.includes('tmossnqfwfwjrtzwcbmm'))
 assert.ok(!url.includes('trfsjuseqjxlhrxuvdsm'))
 const unauth=sb()
 const anonRead=await unauth.from('autonomous_company_state').select('*')
 if (anonRead.error) assert.equal(anonRead.error.code,'42501','anon read must be denied by table privilege/RLS')
 else assert.equal(anonRead.data?.length,0,'anon must not see autonomous company state')

 const db=sb(),signed=await db.auth.signInWithPassword({email,password})
 if(signed.error)throw signed.error
 const profile=await db.from('usuarios').select('tipo,activo').eq('id',signed.data.user.id).single()
 if(profile.error)throw profile.error
 assert.equal(profile.data.activo,true)
 const originalRole=profile.data.tipo
 const service=privileged()
 if(originalRole!=='superadmin'){
  const denied=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'SHADOW',p_reason:'authorization probe'})
  assert.ok(denied.error,'non-superadmin admin must not change corporate autonomy')
  const hidden=await db.from('autonomous_departments').select('department_id')
  if(hidden.error)assert.equal(hidden.error.code,'42501','ordinary Admin governance read must be denied')
  else assert.equal(hidden.data?.length,0,'ordinary Admin must not read autonomous governance state')
  const promoted=await service.from('usuarios').update({tipo:'superadmin'}).eq('id',signed.data.user.id)
  if(promoted.error)throw promoted.error
  const refreshed=await db.auth.refreshSession()
  if(refreshed.error)throw refreshed.error
  await new Promise(resolve=>setTimeout(resolve,150))
 }
 const fixtureJobIds=[]
 try{
 const departments=await db.from('autonomous_departments').select('department_id,name')
 if(departments.error)throw departments.error
 assert.equal(departments.data.length,13)
 assert.equal(departments.data.some(x=>x.department_id===13),false)

 const agents=await db.from('autonomous_agents').select('id,department_id,name,status,authority_class')
 if(agents.error)throw agents.error
 assert.equal(agents.data.filter(x=>x.department_id===14&&x.status!=='DISABLED').length,6,'D14 must expose exactly six active independent agents')
 const yellowGovernanceAgent=agents.data.find(x=>x.department_id===14&&x.status!=='DISABLED'&&x.authority_class==='YELLOW')
 const redGovernanceAgent=agents.data.find(x=>x.department_id===14&&x.status!=='DISABLED'&&x.authority_class==='RED')
 const technologyAgent=agents.data.find(x=>x.department_id===8&&x.status!=='DISABLED')
 assert.ok(yellowGovernanceAgent?.id&&redGovernanceAgent?.id&&technologyAgent?.id,'governance fixtures require persisted owners matching their authority')
 const sims=await db.from('autonomous_qa_simulators').select('role,status')
 if(sims.error)throw sims.error
 assert.equal(sims.data.filter(x=>x.status==='ACTIVE').length,3,'QA Lab must expose three active simulator actors')
 const coverage=await db.from('autonomous_quality_coverage').select('coverage_key,status')
 if(coverage.error)throw coverage.error
 assert.ok(coverage.data.length>=7,'QA coverage map must be persisted')
 const routes=await db.from('autonomous_model_routes').select('task_class,status,max_cost')
 if(routes.error)throw routes.error
 assert.ok(routes.data.some(x=>x.task_class==='AGENT_CONSULTATION'))
 assert.ok(routes.data.every(x=>Number(x.max_cost)===0),'pre-production model routes must not silently spend')

 const metaScenario=await db.from('autonomous_qa_scenarios').select('id').eq('scenario_key','qa-meta-seeded-defect').single()
 if(metaScenario.error)throw metaScenario.error
 const meta=await db.rpc('superadmin_validate_meta_qa',{p_scenario_id:metaScenario.data.id})
 if(meta.error){
   assert.match(meta.error.message,/PERSISTED_META_QA_CALIBRATION_REQUIRED/)
 }else{
   assert.equal(meta.data.status,'PASSED')
   assert.equal(meta.data.permanent_regression,true)
   const gateAfterMeta=await db.from('autonomous_release_gate').select('meta_qa_validated,meta_qa_run_id').eq('gate_key','CUSTOMER_1').single()
   if(gateAfterMeta.error)throw gateAfterMeta.error
   assert.equal(gateAfterMeta.data.meta_qa_validated,true)
   assert.equal(gateAfterMeta.data.meta_qa_run_id,meta.data.id)
 }

 const enqueueExecutable=async args=>{
  let result=await db.rpc('autonomous_enqueue_job',args)
  if(result.error?.message?.includes('AUTONOMY_NOT_EXECUTABLE')){
   const recovered=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'ON',p_reason:'isolated runtime fixture recovery before enqueue'})
   if(recovered.error)throw recovered.error
   result=await db.rpc('autonomous_enqueue_job',args)
  }
  return result
 }

 const shadow=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'SHADOW',p_reason:'isolated runtime validation'})
 if(shadow.error)throw shadow.error
 assert.equal(shadow.data.mode,'SHADOW')
 const onForYellow=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'ON',p_reason:'isolated YELLOW approval validation'})
 if(onForYellow.error)throw onForYellow.error

 const yellow=await enqueueExecutable({p_department_id:14,p_agent_id:yellowGovernanceAgent.id,p_objective:'Runtime YELLOW dual control probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-yellow',p_service_id:null,p_authority_class:'YELLOW',p_idempotency_key:'ugo-autonomy-yellow-'+crypto.randomUUID(),p_input_evidence:[{type:'integration_test'}]})
 if(yellow.error)throw yellow.error
 fixtureJobIds.push(yellow.data.id)
 assert.equal(yellow.data.status,'WAITING_APPROVAL')
 assert.equal(yellow.data.blocked_reason,'YELLOW_DUAL_CONTROL_REQUIRED')
 const yellowFirst=await db.rpc('superadmin_decide_autonomous_job',{p_job_id:yellow.data.id,p_approve:true,p_reason:'isolated YELLOW first approval'})
 if(yellowFirst.error)throw yellowFirst.error
 assert.equal(yellowFirst.data.status,'WAITING_APPROVAL')
 assert.equal(yellowFirst.data.authorization_decision,'DUAL_CONTROL_PENDING')
 let yellowSameActor=await db.rpc('superadmin_decide_autonomous_job',{p_job_id:yellow.data.id,p_approve:true,p_reason:'same actor must fail'})
 if(yellowSameActor.error?.message?.includes('AUTONOMY_NOT_EXECUTABLE')){
  const recovered=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'ON',p_reason:'isolated YELLOW second-approval fixture recovery'})
  if(recovered.error)throw recovered.error
  yellowSameActor=await db.rpc('superadmin_decide_autonomous_job',{p_job_id:yellow.data.id,p_approve:true,p_reason:'same actor must fail'})
 }
 assert.ok(yellowSameActor.error)
 assert.match(yellowSameActor.error.message,/INDEPENDENT_SECOND_APPROVER_REQUIRED/)

 const redKey='ugo-autonomy-red-'+crypto.randomUUID()
 const red=await enqueueExecutable({p_department_id:14,p_agent_id:redGovernanceAgent.id,p_objective:'Runtime governance approval probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test',p_service_id:null,p_authority_class:'RED',p_idempotency_key:redKey,p_input_evidence:[{type:'integration_test'}]})
 if(red.error)throw red.error
 fixtureJobIds.push(red.data.id)
 assert.equal(red.data.status,'WAITING_APPROVAL')
 const retry=await db.rpc('autonomous_enqueue_job',{p_department_id:14,p_agent_id:redGovernanceAgent.id,p_objective:'Runtime governance approval probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test',p_service_id:null,p_authority_class:'RED',p_idempotency_key:redKey,p_input_evidence:[{type:'integration_test'}]})
 if(retry.error)throw retry.error
 assert.equal(retry.data.id,red.data.id)

 const redApprove=await db.rpc('superadmin_decide_autonomous_job',{p_job_id:red.data.id,p_approve:true,p_reason:'isolated RED human approval'})
 if(redApprove.error)throw redApprove.error
 assert.equal(redApprove.data.status,'QUEUED')
 assert.equal(redApprove.data.authorization_decision,'AUTHORIZED_HUMAN')
 const redRejectSeed=await enqueueExecutable({p_department_id:14,p_agent_id:redGovernanceAgent.id,p_objective:'Runtime RED rejection probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test-reject',p_service_id:null,p_authority_class:'RED',p_idempotency_key:'ugo-autonomy-red-reject-'+crypto.randomUUID(),p_input_evidence:[{type:'integration_test'}]})
 if(redRejectSeed.error)throw redRejectSeed.error
 fixtureJobIds.push(redRejectSeed.data.id)
 const redReject=await db.rpc('superadmin_decide_autonomous_job',{p_job_id:redRejectSeed.data.id,p_approve:false,p_reason:'isolated RED rejection'})
 if(redReject.error)throw redReject.error
 assert.equal(redReject.data.status,'CANCELLED')
 assert.equal(redReject.data.authorization_decision,'DENIED')
 const offAfterApproval=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'authority approval probe complete'})
 if(offAfterApproval.error)throw offAfterApproval.error
 const shadowAgain=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'SHADOW',p_reason:'containment probe setup'})
 if(shadowAgain.error)throw shadowAgain.error

 const kill=await db.rpc('superadmin_set_kill_switch',{p_scope_type:'DEPARTMENT',p_scope_key:'8',p_enabled:true,p_reason:'runtime containment probe'})
 if(kill.error)throw kill.error
 const blocked=await db.rpc('autonomous_enqueue_job',{p_department_id:8,p_agent_id:technologyAgent.id,p_objective:'Must be contained',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test',p_service_id:null,p_authority_class:technologyAgent.authority_class,p_idempotency_key:'ugo-autonomy-kill-'+crypto.randomUUID(),p_input_evidence:[]})
 assert.ok(blocked.error)
 assert.match(blocked.error.message,/AUTONOMY_(?:NOT_EXECUTABLE|CONTAINED)/)
 const recovered=await db.rpc('superadmin_recover_kill_switch',{p_scope_type:'DEPARTMENT',p_scope_key:'8',p_verification:{evidence_refs:['integration-runtime-containment']},p_reason:'isolated verified recovery'})
 if(recovered.error)throw recovered.error
 assert.equal(recovered.data.decision,'RECOVER')
 const off=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'runtime validation complete; safe default restored'})
 if(off.error)throw off.error
 assert.equal(off.data.mode,'OFF')
 } finally {
  for(const id of fixtureJobIds){
   const row=await service.from('autonomous_jobs').select('status').eq('id',id).maybeSingle()
   if(row.error)throw row.error
   if(row.data&&['QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED'].includes(row.data.status)){
    const cancelled=await db.rpc('superadmin_cancel_autonomous_job',{p_job_id:id,p_reason:'isolated governance fixture cleanup'})
    if(cancelled.error)throw cancelled.error
    assert.equal(cancelled.data.status,'CANCELLED','governance fixture cleanup must persist cancellation')
   }
  }
  const remaining=await service.from('autonomous_jobs').select('id,status').in('id',fixtureJobIds).in('status',['QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED'])
  if(remaining.error)throw remaining.error
  assert.equal(remaining.data?.length,0,'governance runtime must not leak executable approval fixtures')
  await db.rpc('superadmin_set_kill_switch',{p_scope_type:'DEPARTMENT',p_scope_key:'8',p_enabled:false,p_reason:'runtime cleanup'})
  await db.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'runtime cleanup; safe default'})
  if(originalRole!=='superadmin'){
   const restored=await service.from('usuarios').update({tipo:originalRole}).eq('id',signed.data.user.id)
   if(restored.error)throw restored.error
  }
  await db.auth.signOut()
 }
})
