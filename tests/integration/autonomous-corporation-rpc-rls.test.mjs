import test from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const enabled=Boolean(url&&anon&&email&&password)
const sb=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})

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
 if(profile.data.tipo!=='superadmin'){
  const denied=await db.rpc('superadmin_set_autonomy_mode',{p_mode:'SHADOW',p_reason:'authorization probe'})
  assert.ok(denied.error,'non-superadmin admin must not change corporate autonomy')
  const hidden=await db.from('autonomous_departments').select('department_id')
  if (hidden.error) assert.equal(hidden.error.code,'42501','ordinary Admin governance read must be denied')
  else assert.equal(hidden.data?.length,0,'ordinary Admin must not read autonomous governance state')
  return
 }
 const departments=await db.from('autonomous_departments').select('department_id,name')
 if(departments.error)throw departments.error
 assert.equal(departments.data.length,13)
 assert.equal(departments.data.some(x=>x.department_id===13),false)

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
 await db.auth.signOut()
})
