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
 try{
 const departments=await db.from('autonomous_departments').select('department_id,name')
 if(departments.error)throw departments.error
 assert.equal(departments.data.length,13)
 assert.equal(departments.data.some(x=>x.department_id===13),false)

 const agents=await db.from('autonomous_agents').select('id,department_id,name')
 if(agents.error)throw agents.error
 assert.equal(agents.data.filter(x=>x.department_id===14).length,6,'D14 must expose exactly six independent agents')
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
 if(meta.error)throw meta.error
 assert.equal(meta.data.status,'FAILED')
 assert.equal(meta.data.judge_result?.expected_failure_detected,true)
 const gateAfterMeta=await db.from('autonomous_release_gate').select('meta_qa_validated,meta_qa_run_id').eq('gate_key','CUSTOMER_1').single()
 if(gateAfterMeta.error)throw gateAfterMeta.error
 assert.equal(gateAfterMeta.data.meta_qa_validated,true)
 assert.equal(gateAfterMeta.data.meta_qa_run_id,meta.data.id)

 const shadow=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'SHADOW',p_reason:'isolated runtime validation'})
 if(shadow.error)throw shadow.error
 assert.equal(shadow.data.mode,'SHADOW')

 const redKey='ugo-autonomy-red-'+crypto.randomUUID()
 const red=await db.rpc('autonomous_enqueue_job',{p_department_id:14,p_agent_id:null,p_objective:'Runtime governance approval probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test',p_service_id:null,p_authority_class:'RED',p_idempotency_key:redKey,p_input_evidence:[{type:'integration_test'}]})
 if(red.error)throw red.error
 assert.equal(red.data.status,'WAITING_APPROVAL')
 const retry=await db.rpc('autonomous_enqueue_job',{p_department_id:14,p_agent_id:null,p_objective:'Runtime governance approval probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test',p_service_id:null,p_authority_class:'RED',p_idempotency_key:redKey,p_input_evidence:[{type:'integration_test'}]})
 if(retry.error)throw retry.error
 assert.equal(retry.data.id,red.data.id)

 const onForApproval=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'ON',p_reason:'isolated authority approval validation'})
 if(onForApproval.error)throw onForApproval.error
 const redApprove=await db.rpc('superadmin_decide_autonomous_job',{p_job_id:red.data.id,p_approve:true,p_reason:'isolated RED human approval'})
 if(redApprove.error)throw redApprove.error
 assert.equal(redApprove.data.status,'QUEUED')
 assert.equal(redApprove.data.authorization_decision,'AUTHORIZED_HUMAN')
 const redRejectSeed=await db.rpc('autonomous_enqueue_job',{p_department_id:14,p_agent_id:null,p_objective:'Runtime RED rejection probe',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test-reject',p_service_id:null,p_authority_class:'RED',p_idempotency_key:'ugo-autonomy-red-reject-'+crypto.randomUUID(),p_input_evidence:[{type:'integration_test'}]})
 if(redRejectSeed.error)throw redRejectSeed.error
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
 const blocked=await db.rpc('autonomous_enqueue_job',{p_department_id:8,p_agent_id:null,p_objective:'Must be contained',p_trigger_type:'TEST',p_target_type:'governance',p_target_id:'runtime-test',p_service_id:null,p_authority_class:'GREEN',p_idempotency_key:'ugo-autonomy-kill-'+crypto.randomUUID(),p_input_evidence:[]})
 assert.ok(blocked.error)
 assert.match(blocked.error.message,/AUTONOMY_NOT_EXECUTABLE/)
 const unkill=await db.rpc('superadmin_set_kill_switch',{p_scope_type:'DEPARTMENT',p_scope_key:'8',p_enabled:false,p_reason:'runtime probe complete'})
 if(unkill.error)throw unkill.error
 const off=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'runtime validation complete; safe default restored'})
 if(off.error)throw off.error
 assert.equal(off.data.mode,'OFF')
 } finally {
  await db.rpc('superadmin_set_kill_switch',{p_scope_type:'DEPARTMENT',p_scope_key:'8',p_enabled:false,p_reason:'runtime cleanup'})
  await db.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'runtime cleanup; safe default'})
  if(originalRole!=='superadmin'){
   const restored=await service.from('usuarios').update({tipo:originalRole}).eq('id',signed.data.user.id)
   if(restored.error)throw restored.error
  }
  await db.auth.signOut()
 }
})
