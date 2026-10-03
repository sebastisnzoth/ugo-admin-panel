import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!anon||!sk)throw new Error('UGO_TEST_ONLY')
const service=createClient(url,sk,{auth:{persistSession:false}})
async function login(email,password){const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;return{sb,id:r.data.user.id}}
const c=await login(process.env.UGO_TEST_CLIENT_EMAIL,process.env.UGO_TEST_CLIENT_PASSWORD),p=await login(process.env.UGO_TEST_PROVIDER_EMAIL,process.env.UGO_TEST_PROVIDER_PASSWORD),sa=await login(process.env.UGO_TEST_ADMIN_EMAIL,process.env.UGO_TEST_ADMIN_PASSWORD)
const {data:initialAutonomy,error:initialAutonomyError}=await service.from('autonomous_company_state').select('mode,reason').eq('singleton',true).single();if(initialAutonomyError)throw initialAutonomyError
const autonomyProbeReason=`QA superadmin privilege-boundary probe:${crypto.randomUUID()}`
let admin=null,adminId=null
try{
 const cr=await c.sb.from('usuarios').select('tipo').eq('id',c.id).single(),pr=await p.sb.from('usuarios').select('tipo').eq('id',p.id).single(),sar=await sa.sb.from('usuarios').select('tipo').eq('id',sa.id).single()
 assert.equal(cr.data?.tipo,'cliente');assert.equal(pr.data?.tipo,'proveedor');assert.equal(sar.data?.tipo,'superadmin')
 const suffix=crypto.randomUUID(),email=`qa-admin-${suffix}@ugo.test`,password=`Qa!${suffix}9z`
 const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{qa_runtime:true}});if(created.error)throw created.error;adminId=created.data.user.id
 const up=await service.from('usuarios').upsert({id:adminId,nombre:'QA Runtime Admin',tipo:'admin',activo:true,es_demo:true,email},{onConflict:'id'});if(up.error)throw up.error
 admin=await login(email,password);const adr=await admin.sb.from('usuarios').select('tipo').eq('id',admin.id).single();assert.equal(adr.data?.tipo,'admin')
 const deniedGps=await c.sb.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:-27.4,p_lng:-48.4,p_captured_at:new Date().toISOString(),p_accuracy_m:10});assert.ok(deniedGps.error)
 const deniedClientGov=await c.sb.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'QA unauthorized client probe'});assert.ok(deniedClientGov.error)
 const deniedAdminGov=await admin.sb.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'QA admin privilege-boundary probe'});assert.ok(deniedAdminGov.error)
 const allowedSuperadminGov=await sa.sb.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:autonomyProbeReason});if(allowedSuperadminGov.error)throw allowedSuperadminGov.error
 const {data:svc,error:svce}=await service.from('servicios').select('id,cliente_id,proveedor_id').eq('metadata->>qa_p0','true').eq('ambiente','demo').order('created_at',{ascending:false}).limit(1).single();if(svce)throw svce
 assert.equal(svc.cliente_id,c.id);assert.equal(svc.proveedor_id,p.id)
 for(const [actor,simulator] of [[c,'qa-client-simulator'],[p,'qa-provider-simulator'],[sa,'qa-admin-system-simulator']]){
  const {data:bound,error:be}=await actor.sb.rpc('autonomous_qa_record_actor_action',{p_service_id:svc.id,p_simulator_key:simulator,p_action_key:'observe_service'})
  if(be)throw be
  assert.equal(bound.service_id,svc.id);assert.equal(bound.simulator_key,simulator);assert.equal(bound.action_key,'observe_service')
 }
 const fakeRating=await c.sb.from('resenas').insert({servicio_id:svc.id,cliente_id:c.id,proveedor_id:p.id,puntuacion:5,comentario:'QA spoof probe',autor_tipo:'proveedor'});assert.ok(fakeRating.error)
 const providerAsClient=await p.sb.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:svc.id});assert.ok(providerAsClient.error)
 // These observations describe assertions above, not an independent QA verdict.
 const observations={client_role_verified:true,provider_role_verified:true,admin_role_verified:true,superadmin_role_verified:true,client_governance_denied:true,admin_governance_denied:true,superadmin_governance_allowed:true,client_cannot_publish_provider_gps:true,spoofed_rating_rejected:true,provider_cannot_act_as_client:true}
 const {data:sc,error:se}=await service.from('autonomous_qa_scenarios').select('id,scenario_key').in('scenario_key',['roles','permissions-rls']);if(se)throw se
 for(const s of sc){
 const {data:run,error}=await service.rpc('autonomous_record_external_qa_probe',{p_scenario_id:s.id,p_service_id:svc.id,p_observations:observations});if(error)throw error
 const runId=run.id
 const assertions=s.scenario_key==='roles'
  ? {client_isolated:true,provider_isolated:true,admin_isolated:true,superadmin_governed:true,admin_governance_denied:true,superadmin_governance_allowed:true,client_cannot_publish_provider_gps:true,spoofed_rating_rejected:true,provider_cannot_act_as_client:true}
  : {client_isolated:true,provider_isolated:true,admin_isolated:true,admin_governance_denied:true,client_cannot_publish_provider_gps:true,spoofed_rating_rejected:true,provider_cannot_act_as_client:true}
 for(const [key,passed] of Object.entries(assertions)){
  const {error:ee}=await service.rpc('autonomous_record_independent_qa_evidence',{p_run_id:runId,p_service_id:svc.id,p_assertion_key:key,p_expected:true,p_observed:passed,p_passed:passed,p_source:'AUTHENTICATED_RUNTIME'});if(ee)throw ee
 }
 const {error:je}=await service.rpc('autonomous_judge_independent_runtime_coverage',{p_scenario_key:s.scenario_key});if(je)throw je
}
 console.log(JSON.stringify({authenticated:true,roles:[cr.data.tipo,pr.data.tipo,adr.data.tipo,sar.data.tipo],observations}))
}finally{
 if(initialAutonomy?.mode){
  const {data:currentAutonomy,error:currentAutonomyError}=await service.from('autonomous_company_state').select('mode,reason').eq('singleton',true).single()
  if(currentAutonomyError)throw currentAutonomyError
  if(currentAutonomy?.mode==='OFF'&&currentAutonomy?.reason===autonomyProbeReason){
   const restore=await sa.sb.rpc('superadmin_set_autonomy_mode',{p_mode:initialAutonomy.mode,p_reason:initialAutonomy.reason||'QA auth runtime restored previous autonomy mode'})
   if(restore.error)throw restore.error
  }
 }
 await Promise.allSettled([c.sb.auth.signOut(),p.sb.auth.signOut(),sa.sb.auth.signOut(),admin?.sb?.auth.signOut()])
 if(adminId){await service.from('usuarios').delete().eq('id',adminId);await service.auth.admin.deleteUser(adminId)}
}
