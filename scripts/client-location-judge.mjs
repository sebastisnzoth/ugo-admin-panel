import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/client-location-runtime.json','utf8'))
const failures=[]
if(runtime.readiness_id!=='client-location')failures.push('wrong readiness_id')
if(runtime.environment!=='UGO TEST')failures.push('environment is not UGO TEST')
if(runtime.sha!==(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||runtime.sha))failures.push('runtime SHA mismatch')
for(const key of ['valid_geolocation_populates_form','map_reflects_confirmed_pickup','pickup_coordinates_persist_in_request_draft','manual_address_edit_clears_stale_pickup','zero_zero_rejected_fail_closed','permission_denied_message','timeout_message','no_page_errors']){
 if(runtime.assertions?.[key]!==true)failures.push('missing PASS '+key)
}
assert.equal(runtime.result,'PASS','runtime result must PASS')
const report={readiness_id:'client-location',validator:'Judge',result:failures.length?'FAIL':'PASS',runtime_sha:runtime.sha,failures,created_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-location-judge.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report))
if(failures.length)process.exit(1)
