import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!anon||!sk)throw new Error('UGO_TEST_ONLY')
const service=createClient(url,sk,{auth:{persistSession:false}}),p=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const login=await p.auth.signInWithPassword({email:process.env.UGO_TEST_PROVIDER_EMAIL,password:process.env.UGO_TEST_PROVIDER_PASSWORD});if(login.error)throw login.error
try{
 const {data:svc,error:se}=await service.from('servicios').select('id,ubicacion_cliente').eq('metadata->>qa_p0','true').eq('ambiente','demo').order('created_at',{ascending:false}).limit(1).single();if(se)throw se
 const zero=await p.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:0,p_lng:0,p_captured_at:new Date().toISOString(),p_accuracy_m:10})
 const stale=await p.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:-27.4167917,p_lng:-48.4242297,p_captured_at:new Date(Date.now()-60000).toISOString(),p_accuracy_m:10})
 const inaccurate=await p.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:-27.4167917,p_lng:-48.4242297,p_captured_at:new Date().toISOString(),p_accuracy_m:999})
 assert.ok(zero.error);assert.ok(stale.error);assert.ok(inaccurate.error)
 // Report only assertions executed above. Arrival/geofence and persisted state
 // require separate probes and must remain uncovered until independently judged.
 const observations={zero_zero_rejected:true,stale_gps_rejected:true,inaccurate_gps_rejected:true}
 const {data:sc,error:sce}=await service.from('autonomous_qa_scenarios').select('id').eq('scenario_key','gps-geofence').single();if(sce)throw sce
 const {error:re}=await service.rpc('autonomous_record_external_qa_probe',{p_scenario_id:sc.id,p_service_id:svc.id,p_observations:observations});if(re)throw re
 console.log(JSON.stringify({gpsGeofence:true,zero:zero.error.code,stale:stale.error.code,inaccurate:inaccurate.error.code}))
}finally{await p.auth.signOut()}
