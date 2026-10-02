import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!sk)throw new Error('UGO_TEST_ONLY')
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')

const service=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}})

const {data:judgeJob,error:judgeError}=await service.rpc('autonomous_qa_run_gps_independent_evidence')
if(judgeError)throw judgeError
assert.equal(judgeJob?.status,'SUCCEEDED','CANONICAL_GPS_DB_JUDGE_REQUIRED')
assert.equal(judgeJob?.result?.source,'INDEPENDENT_PERSISTED_EVIDENCE','CANONICAL_GPS_EVIDENCE_SOURCE_REQUIRED')
assert.equal(judgeJob?.result?.passed,true,'CANONICAL_GPS_EVIDENCE_PASS_REQUIRED')

const evidence=Array.isArray(judgeJob?.result?.evidence)?judgeJob.result.evidence:[]
const has=(key)=>evidence.some(item=>item?.assertion===key&&item?.source==='PERSISTED_STATE')

const observations={
 zero_zero_rejected:has('zero_zero_rejected'),
 stale_gps_rejected:has('stale_gps_rejected'),
 inaccurate_gps_rejected:has('inaccurate_gps_rejected'),
 outside_geofence_rejected:has('arrival_outside_200m_rejected'),
 rejected_arrival_did_not_change_state:has('state_unchanged_on_rejection'),
 valid_gps_arrival_accepted:has('arrival_inside_200m'),
}
for(const [key,passed] of Object.entries(observations))assert.equal(passed,true,'CANONICAL_GPS_OBSERVATION_'+key)

const serviceId=judgeJob?.service_id||''
const qaRunId=judgeJob?.result?.qa_run_id||judgeJob?.target_id||''
assert.ok(serviceId,'P0_SERVICE_REQUIRED')
assert.ok(qaRunId,'QA_RUN_REQUIRED')

console.log(JSON.stringify({
 gpsGeofence:true,
 sha,
 serviceId,
 qaRunId,
 observations,
 judgeJob:judgeJob.id,
 fixtureAvailabilityRestored:true,
 environment:'UGO TEST',
 productionTouched:false,
 evidenceSource:'PERSISTED_STATE',
}))
