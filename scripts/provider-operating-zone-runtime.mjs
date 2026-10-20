import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(serviceRole&&sha,'PROVIDER_OPERATING_ZONE_RUNTIME_INPUTS_REQUIRED')
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
// Retry only transport-level 502/503/504 failures from the TEST gateway.
// Never repeat a SQL statement timeout: the transaction may have held locks,
// and blindly replaying it could mask an actual database contention defect.
let data,error;
for(let attempt=1;attempt<=3;attempt++){
  ({data,error}=await admin.rpc('autonomous_qa_provider_operating_radius'));
  if(!error)break;
  const status=Number(error.status||0);
  const message=String(error.message||'');
  const gatewayFailure=[502,503,504].includes(status)||/^(Bad Gateway|Service Unavailable|Gateway Timeout)$/i.test(message)||/<html[\s>]|<!DOCTYPE html/i.test(message)||/^(?:TypeError: )?fetch failed$/i.test(message)&&/UND_ERR_HEADERS_TIMEOUT|HeadersTimeoutError|fetch failed/i.test(String(error.details||error.hint||message));
  if(!gatewayFailure||attempt===3)break;
  console.warn('UGO_TEST_GATEWAY_TEMPORARY_UNAVAILABLE',JSON.stringify({attempt,status}));
  await new Promise(resolve=>setTimeout(resolve,attempt*2000));
}
assert.ifError(error);assert.ok(data)
assert.equal(data.small_radius_km,5);assert.equal(data.large_radius_km,15);assert.equal(data.test_distance_km,10);assert.equal(data.small_radius_rejected,true);assert.equal(data.small_radius_offer_count,0);assert.equal(data.large_radius_offer_count,1);assert.equal(data.cleanup_ok,true)
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/provider-operating-zone-runtime.json',JSON.stringify({readiness_id:'provider-operating-zone',sha,environment:'UGO TEST',production_touched:false,...data,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,...data}))
