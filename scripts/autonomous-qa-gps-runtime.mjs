import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!sk)throw new Error('UGO_TEST_ONLY')
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')

const service=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const providerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const required=[
 'zero_zero_rejected',
 'stale_gps_rejected',
 'inaccurate_gps_rejected',
 'arrival_inside_200m',
 'arrival_outside_200m_rejected',
 'state_unchanged_on_rejection',
 'recent_location_required',
]

const {data:profile,error:profileError}=await service
 .from('perfiles_proveedor')
 .select('online,disponible')
 .eq('usuario_id',providerId)
 .single()
if(profileError)throw profileError

let result=null
try{
 const {error:availabilityError}=await service
  .from('perfiles_proveedor')
  .update({online:true,disponible:true})
  .eq('usuario_id',providerId)
 if(availabilityError)throw availabilityError

 const {data:judgeJob,error:judgeError}=await service.rpc('autonomous_qa_run_gps_independent_evidence')
 if(judgeError)throw judgeError
 assert.equal(judgeJob?.status,'SUCCEEDED','GPS_INDEPENDENT_JUDGE_REQUIRED')
 const verification=judgeJob?.verification_result||{}
 assert.equal(verification.passed,true,'GPS_INDEPENDENT_VERDICT_REQUIRED')
 assert.equal(verification.source,'INDEPENDENT_PERSISTED_EVIDENCE','GPS_INDEPENDENT_SOURCE_REQUIRED')
 const evidence=Array.isArray(verification.evidence)?verification.evidence:[]
 const assertions=new Set(evidence.map(item=>String(item?.assertion||'')))
 for(const key of required)assert.ok(assertions.has(key),'GPS_EVIDENCE_MISSING_'+key)

 const qaRunId=verification.qa_run_id||judgeJob?.target_id||null
 const serviceId=judgeJob?.service_id||null
 assert.ok(qaRunId,'GPS_QA_RUN_REQUIRED')
 assert.ok(serviceId,'GPS_SERVICE_REQUIRED')
 const observations=Object.fromEntries(required.map(key=>[key,true]))
 result={
  gpsGeofence:true,
  sha,
  serviceId,
  qaRunId,
  observations,
  judgeJob:judgeJob.id,
  verification_result:verification,
  fixtureAvailabilityRestored:false,
  environment:'UGO TEST',
  productionTouched:false,
 }
}finally{
 const {error:restoreError}=await service
  .from('perfiles_proveedor')
  .update({online:Boolean(profile.online),disponible:Boolean(profile.disponible)})
  .eq('usuario_id',providerId)
 if(restoreError)throw restoreError
 if(result)result.fixtureAvailabilityRestored=true
}

assert.ok(result,'GPS_RUNTIME_RESULT_REQUIRED')
console.log(JSON.stringify(result))
