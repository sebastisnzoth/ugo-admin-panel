import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!anon||!sk)throw new Error('UGO_TEST_ONLY')
const service=createClient(url,sk,{auth:{persistSession:false}}),p=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function signInWithRetry(){
 let lastError=null
 for(let attempt=1;attempt<=3;attempt+=1){
  const login=await p.auth.signInWithPassword({email:process.env.UGO_TEST_PROVIDER_EMAIL,password:process.env.UGO_TEST_PROVIDER_PASSWORD})
  if(!login.error)return login
  lastError=login.error
  const status=Number(login.error?.status||0)
  if(!(status>=500||login.error?.name==='AuthRetryableFetchError')||attempt===3)break
  await sleep(1000*attempt)
 }
 throw lastError
}
await signInWithRetry()
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
 const {data:run,error:re}=await service.rpc('autonomous_record_external_qa_probe',{p_scenario_id:sc.id,p_service_id:svc.id,p_observations:observations});if(re)throw re
 for(const [key,passed] of Object.entries(observations)){
  const {error:ee}=await service.rpc('autonomous_record_independent_qa_evidence',{p_run_id:run.id,p_service_id:svc.id,p_assertion_key:key,p_expected:true,p_observed:passed,p_passed:passed,p_source:'AUTHENTICATED_RUNTIME'});if(ee)throw ee
 }
 const {data:judgeJob,error:judgeError}=await service.rpc('autonomous_qa_run_gps_independent_evidence')
 if(judgeError)throw judgeError
 assert.equal(judgeJob?.status,'SUCCEEDED')
 console.log(JSON.stringify({gpsGeofence:true,zero:zero.error.code,stale:stale.error.code,inaccurate:inaccurate.error.code,judgeJob:judgeJob.id}))
}finally{await p.auth.signOut()}
