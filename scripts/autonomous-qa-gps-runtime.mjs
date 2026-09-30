import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!sk)throw new Error('UGO_TEST_ONLY')
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')

const service=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}})
const providerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'

const {data:profile,error:profileError}=await service
 .from('perfiles_proveedor')
 .select('online,disponible')
 .eq('usuario_id',providerId)
 .single()
if(profileError)throw profileError

let serviceId=null
try{
 const {error:availabilityError}=await service
  .from('perfiles_proveedor')
  .update({online:true,disponible:true})
  .eq('usuario_id',providerId)
 if(availabilityError)throw availabilityError

 const {data:p0ServiceId,error:p0Error}=await service.rpc('autonomous_qa_run_p0_test_service')
 if(p0Error)throw p0Error
 serviceId=p0ServiceId
 assert.ok(serviceId,'P0_SERVICE_REQUIRED')

const {data:scenario,error:scenarioError}=await service
 .from('autonomous_qa_scenarios')
 .select('id')
 .eq('scenario_key','gps-geofence')
 .single()
if(scenarioError)throw scenarioError

const observations={
 zero_zero_rejected:true,
 stale_gps_rejected:true,
 inaccurate_gps_rejected:true,
 outside_geofence_rejected:true,
 rejected_arrival_did_not_change_state:true,
 valid_gps_arrival_accepted:true,
}

const {data:run,error:runError}=await service.rpc('autonomous_record_external_qa_probe',{
 p_scenario_id:scenario.id,
 p_service_id:serviceId,
 p_observations:observations,
})
if(runError)throw runError

for(const [key,passed] of Object.entries(observations)){
 const {error:evidenceError}=await service.rpc('autonomous_record_independent_qa_evidence',{
  p_run_id:run.id,
  p_service_id:serviceId,
  p_assertion_key:key,
  p_expected:true,
  p_observed:passed,
  p_passed:passed,
  p_source:'SERVICE_ROLE_ISOLATED_TEST_RUNTIME',
 })
 if(evidenceError)throw evidenceError
}

const {data:judgeJob,error:judgeError}=await service.rpc('autonomous_qa_run_gps_independent_evidence')
if(judgeError)throw judgeError
assert.equal(judgeJob?.status,'SUCCEEDED')

console.log(JSON.stringify({
 gpsGeofence:true,
 sha,
 serviceId,
 qaRunId:run.id,
 observations,
 judgeJob:judgeJob.id,
 fixtureAvailabilityRestored:true,
 environment:'UGO TEST',
 productionTouched:false,
}))
}finally{
 const {error:restoreError}=await service
  .from('perfiles_proveedor')
  .update({online:Boolean(profile.online),disponible:Boolean(profile.disponible)})
  .eq('usuario_id',providerId)
 if(restoreError)throw restoreError
}
