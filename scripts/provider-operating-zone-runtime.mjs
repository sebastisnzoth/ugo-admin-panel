import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
import{retrySupabaseResult}from'./lib/transient-retry.mjs'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(serviceRole&&sha,'PROVIDER_OPERATING_ZONE_RUNTIME_INPUTS_REQUIRED')
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
// El RPC fija un advisory lock; bajo carga las corridas 2026-10-20 colgaban
// >45 s y cada intento abandonado seguía ocupando conexiones del pooler.
// Plazo por intento de 45 s con abort REAL de la petición: PostgREST cancela
// la consulta en el servidor y libera la conexión antes de reintentar.
const withDeadline=async(label,ms,build)=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);if(timer.unref)timer.unref();try{return await build(controller.signal)}catch(error){if(controller.signal.aborted){const aborted=new Error(label+' CLIENT_DEADLINE_'+ms+'MS');aborted.code='57014';aborted.status=504;throw aborted}throw error}finally{clearTimeout(timer)}}
const{data,error}=await retrySupabaseResult(()=>withDeadline('provider-operating-zone.rpc',45000,signal=>admin.rpc('autonomous_qa_provider_operating_radius').abortSignal(signal)),{label:'provider-operating-zone.rpc',attempts:4,baseDelayMs:4000});assert.ifError(error);assert.ok(data)
assert.equal(data.small_radius_km,5);assert.equal(data.large_radius_km,15);assert.equal(data.test_distance_km,10);assert.equal(data.small_radius_rejected,true);assert.equal(data.small_radius_offer_count,0);assert.equal(data.large_radius_offer_count,1);assert.equal(data.cleanup_ok,true)
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/provider-operating-zone-runtime.json',JSON.stringify({readiness_id:'provider-operating-zone',sha,environment:'UGO TEST',production_touched:false,...data,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,...data}))
