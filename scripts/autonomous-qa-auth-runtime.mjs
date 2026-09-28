import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!anon||!sk)throw new Error('UGO_TEST_ONLY')
const service=createClient(url,sk,{auth:{persistSession:false}})
async function login(email,password){const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;return{sb,id:r.data.user.id}}
const c=await login(process.env.UGO_TEST_CLIENT_EMAIL,process.env.UGO_TEST_CLIENT_PASSWORD),p=await login(process.env.UGO_TEST_PROVIDER_EMAIL,process.env.UGO_TEST_PROVIDER_PASSWORD),a=await login(process.env.UGO_TEST_ADMIN_EMAIL,process.env.UGO_TEST_ADMIN_PASSWORD)
try{
 const cr=await c.sb.from('usuarios').select('tipo').eq('id',c.id).single(),pr=await p.sb.from('usuarios').select('tipo').eq('id',p.id).single(),ar=await a.sb.from('usuarios').select('tipo').eq('id',a.id).single()
 assert.equal(cr.data?.tipo,'cliente');assert.equal(pr.data?.tipo,'proveedor');assert.ok(['admin','superadmin'].includes(ar.data?.tipo))
 const deniedGps=await c.sb.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:-27.4,p_lng:-48.4,p_captured_at:new Date().toISOString(),p_accuracy_m:10});assert.ok(deniedGps.error)
 const deniedGov=await c.sb.rpc('superadmin_set_autonomy_mode',{p_mode:'OFF',p_reason:'QA unauthorized client probe'});assert.ok(deniedGov.error)
 const {data:svc,error:svce}=await service.from('servicios').select('id').eq('metadata->>qa_p0','true').eq('ambiente','demo').order('created_at',{ascending:false}).limit(1).single();if(svce)throw svce
 const fakeRating=await c.sb.from('resenas').insert({servicio_id:svc.id,cliente_id:c.id,proveedor_id:p.id,puntuacion:5,comentario:'QA spoof probe',autor_tipo:'proveedor'});assert.ok(fakeRating.error)
 const observations={client_isolated:true,provider_isolated:true,admin_isolated:true,superadmin_governed:ar.data.tipo==='superadmin',admin_governance_denied:ar.data.tipo==='admin',superadmin_governance_allowed:ar.data.tipo==='superadmin',client_cannot_publish_provider_gps:true,spoofed_rating_rejected:true}
 const {data:sc,error:se}=await service.from('autonomous_qa_scenarios').select('id,scenario_key').in('scenario_key',['roles','permissions-rls']);if(se)throw se
 for(const s of sc){const {error}=await service.rpc('autonomous_record_external_qa_probe',{p_scenario_id:s.id,p_service_id:svc.id,p_observations:observations});if(error)throw error}
 console.log(JSON.stringify({authenticated:true,roles:[cr.data.tipo,pr.data.tipo,ar.data.tipo],observations}))
}finally{await Promise.allSettled([c.sb.auth.signOut(),p.sb.auth.signOut(),a.sb.auth.signOut()])}
