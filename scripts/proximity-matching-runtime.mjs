import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(serviceRole&&sha,'PROXIMITY_MATCHING_RUNTIME_INPUTS_REQUIRED')
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await admin.rpc('autonomous_qa_proximity_matching');assert.ifError(error);assert.ok(data)
assert.equal(data.baseline_offer_count,1);assert.equal(data.offline_offer_count,0);assert.equal(data.stale_gps_offer_count,0);assert.equal(data.outside_radius_offer_count,0);assert.equal(data.inside_radius_offer_count,1);assert.equal(data.wrong_category_offer_count,0);assert.equal(data.debt_guard_present,true);assert.equal(data.schedule_guard_present,true);assert.equal(data.verification_guard_present,true);assert.equal(data.cleanup_ok,true)
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/proximity-matching-runtime.json',JSON.stringify({readiness_id:'proximity-matching',sha,environment:'UGO TEST',production_touched:false,...data,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,...data}))
