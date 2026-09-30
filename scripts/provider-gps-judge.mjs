import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/provider-gps-runtime.json'
const output=process.argv[3]||'artifacts/provider-gps-judge.json'
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const runtime=JSON.parse(await fs.readFile(input,'utf8'))
assert.equal(runtime.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(runtime.productionTouched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(runtime.gpsGeofence,true,'JUDGE_GPS_GATE_REQUIRED')
assert.ok(runtime.serviceId,'JUDGE_SERVICE_ID_REQUIRED')
assert.ok(runtime.qaRunId,'JUDGE_QA_RUN_REQUIRED')
assert.ok(runtime.judgeJob,'JUDGE_DB_EVIDENCE_JOB_REQUIRED')
assert.equal(runtime.fixtureAvailabilityRestored,true,'JUDGE_FIXTURE_RESTORE_REQUIRED')
const required=[
 'zero_zero_rejected',
 'stale_gps_rejected',
 'inaccurate_gps_rejected',
 'outside_geofence_rejected',
 'rejected_arrival_did_not_change_state',
 'valid_gps_arrival_accepted',
]
for(const key of required) assert.equal(runtime.observations?.[key],true,'JUDGE_OBSERVATION_'+key)
const result={validator:'Judge',readiness_id:'provider-gps',status:'PASS',sha,serviceId:runtime.serviceId,qaRunId:runtime.qaRunId,dbJudgeJob:runtime.judgeJob,checks:required,completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
