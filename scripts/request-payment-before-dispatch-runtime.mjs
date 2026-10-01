import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||'',password=process.env.UGO_TEST_CLIENT_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&serviceRole&&email&&password&&sha,'PAYMENT_DISPATCH_RUNTIME_INPUTS_REQUIRED')
const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await client.auth.signInWithPassword({email,password});assert.ifError(loginError);assert.ok(login.user?.id)
const CLIENT=login.user.id
const{data:templates,error:templateError}=await admin.from('servicios').select('categoria_id,direccion_cliente,zona,ubicacion_cliente').eq('cliente_id',CLIENT).not('ubicacion_cliente','is',null).order('created_at',{ascending:false}).limit(1)
assert.ifError(templateError);const template=templates?.[0];assert.ok(template?.categoria_id&&template?.ubicacion_cliente,'MATCH_TEMPLATE_REQUIRED')
const{data:service,error:createError}=await admin.from('servicios').insert({cliente_id:CLIENT,categoria_id:template.categoria_id,estado:'borrador',descripcion:'UGO TEST payment-before-dispatch '+sha.slice(0,12),direccion_cliente:template.direccion_cliente||'UGO TEST',zona:template.zona||null,ubicacion_cliente:template.ubicacion_cliente,tarifa:120,moneda:'BRL',ambiente:'demo',metadata:{readiness_fixture:'request-payment-before-dispatch',readiness_sha:sha}}).select('id').single()
assert.ifError(createError);assert.ok(service?.id)
const cleared=await admin.from('servicios').update({metadata:{readiness_fixture:'request-payment-before-dispatch',readiness_sha:sha}}).eq('id',service.id);assert.ifError(cleared.error)
const{data:clearedRead,error:clearedReadError}=await admin.from('servicios').select('metadata').eq('id',service.id).single();assert.ifError(clearedReadError);assert.equal(clearedRead.metadata?.requested_payment_method,undefined);assert.equal(clearedRead.metadata?.payment_method,undefined)
let cleanup=false
try{
 const blocked=await client.rpc('iniciar_matching',{p_servicio_id:service.id})
 assert.ok(blocked.error,'MATCHING_WITHOUT_PAYMENT_MUST_FAIL')
 assert.match(String(blocked.error.message||''),/forma de pago/i)
 const before=await admin.from('ofertas_servicio').select('id').eq('servicio_id',service.id);assert.ifError(before.error);assert.equal((before.data||[]).length,0,'NO_OFFER_WITHOUT_PAYMENT')
 const setMethod=await admin.from('servicios').update({metadata:{readiness_fixture:'request-payment-before-dispatch',readiness_sha:sha,requested_payment_method:'efectivo',payment_method:'efectivo',payment_selected_before_order:true}}).eq('id',service.id);assert.ifError(setMethod.error)
 const allowed=await client.rpc('iniciar_matching',{p_servicio_id:service.id});assert.ifError(allowed.error)
 const read=await admin.from('servicios').select('estado,metadata,matching_expires_at').eq('id',service.id).single();assert.ifError(read.error)
 assert.ok(['buscando','ofrecido'].includes(read.data.estado));assert.equal(read.data.metadata?.requested_payment_method,'efectivo');assert.ok(read.data.matching_expires_at)
 const offers=await admin.from('ofertas_servicio').select('id,estado').eq('servicio_id',service.id);assert.ifError(offers.error)
 await fs.mkdir('artifacts',{recursive:true})
 await fs.writeFile('artifacts/request-payment-before-dispatch-runtime.json',JSON.stringify({readiness_id:'request-payment-before-dispatch',sha,environment:'UGO TEST',production_touched:false,service_id:service.id,without_payment_rejected:true,without_payment_offer_count:0,with_payment_matching_allowed:true,with_payment_state:read.data.estado,with_payment_offer_count:(offers.data||[]).length,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
}finally{
 await admin.from('ofertas_servicio').delete().eq('servicio_id',service.id)
 await admin.from('servicios').delete().eq('id',service.id)
 const{data:left}=await admin.from('servicios').select('id').eq('id',service.id).maybeSingle();cleanup=!left
}
assert.equal(cleanup,true,'PAYMENT_DISPATCH_CLEANUP_REQUIRED')
const proof=JSON.parse(await fs.readFile('artifacts/request-payment-before-dispatch-runtime.json','utf8'));proof.cleanup_ok=true
await fs.writeFile('artifacts/request-payment-before-dispatch-runtime.json',JSON.stringify(proof,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,service_id:service.id}))
