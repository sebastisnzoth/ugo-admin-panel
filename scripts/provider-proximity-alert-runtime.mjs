import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(serviceRole&&sha,'PROVIDER_PROXIMITY_ALERT_INPUTS_REQUIRED')
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await admin.rpc('autonomous_qa_provider_proximity_alert');assert.ifError(error);assert.ok(data)
assert.equal(data.test_distance_km,10);assert.equal(data.outside_radius_km,5);assert.equal(data.outside_alert_count,0);assert.equal(data.inside_radius_km,15);assert.equal(data.inside_alert_count,1);assert.equal(data.inside_reported_radius_km,15);assert.equal(data.cleanup_ok,true)
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/provider-proximity-alert-runtime.json',JSON.stringify({readiness_id:'provider-proximity-alert',sha,environment:'UGO TEST',production_touched:false,...data,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,...data}))
