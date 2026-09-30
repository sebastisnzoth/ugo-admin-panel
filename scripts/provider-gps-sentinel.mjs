import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const runtimePath=process.argv[2]||'artifacts/provider-gps-runtime.json'
const judgePath=process.argv[3]||'artifacts/provider-gps-judge.json'
const output=process.argv[4]||'artifacts/provider-gps-sentinel.json'
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const runtime=JSON.parse(await fs.readFile(runtimePath,'utf8'))
const judge=JSON.parse(await fs.readFile(judgePath,'utf8'))
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(judge.status,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.productionTouched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.equal(runtime.fixtureAvailabilityRestored,true,'SENTINEL_FIXTURE_RESTORE_REQUIRED')
assert.equal(runtime.gpsGeofence,true,'SENTINEL_GPS_GATE_REQUIRED')
assert.ok(runtime.serviceId&&runtime.qaRunId&&runtime.judgeJob,'SENTINEL_AUDIT_IDS_REQUIRED')
const result={validator:'Sentinel',readiness_id:'provider-gps',status:'PASS',sha,checks:['same-sha-runtime','judge-pass','ugo-test-only','production-untouched','gps-guards','fixture-restored','audit-ids'],completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
