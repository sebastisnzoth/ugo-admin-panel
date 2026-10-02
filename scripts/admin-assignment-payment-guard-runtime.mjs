import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const adminEmail=process.env.UGO_TEST_ADMIN_EMAIL||'',adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD||'',clientEmail=process.env.UGO_TEST_CLIENT_EMAIL||'',clientPassword=process.env.UGO_TEST_CLIENT_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&serviceRole&&adminEmail&&adminPassword&&clientEmail&&clientPassword&&sha,'ADMIN_ASSIGNMENT_RUNTIME_INPUTS_REQUIRED')

const adminUser=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const fixture=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const[{data:adminLogin,error:adminLoginError},{data:clientLogin,error:clientLoginError}]=await Promise.all([
 adminUser.auth.signInWithPassword({email:adminEmail,password:adminPassword}),
 client.auth.signInWithPassword({email:clientEmail,password:clientPassword})
])
assert.ifError(adminLoginError);assert.ok(adminLogin.user?.id,'TEST_ADMIN_REQUIRED')
assert.ifError(clientLoginError);assert.ok(clientLogin.user?.id,'TEST_CLIENT_REQUIRED')
const CLIENT=clientLogin.user.id

const{data:profiles,error:profilesError}=await fixture.from('perfiles_proveedor').select('usuario_id,categoria_principal_id,estado_verificacion,ubicacion').eq('estado_verificacion','verificado').not('categoria_principal_id','is',null).not('ubicacion','is',null).limit(20)
assert.ifError(profilesError);assert.ok(profiles?.length,'VERIFIED_PROVIDER_REQUIRED')
let provider=null
for(const row of profiles){
 const{data:debts,error}=await fixture.from('deudas_ugo_proveedor').select('id,estado,ambiente,saldo_pendiente').eq('proveedor_id',row.usuario_id)
 assert.ifError(error)
 const pending=(debts||[]).filter(d=>d.ambiente==='real'&&!['pagado','anulado'].includes(d.estado)&&Number(d.saldo_pendiente||0)>0).length
 if(pending<3){provider=row;break}
}
assert.ok(provider,'UNBLOCKED_VERIFIED_PROVIDER_REQUIRED')

const{data:category,error:categoryError}=await fixture.from('categorias').select('id,slug').eq('id',provider.categoria_principal_id).single();assert.ifError(categoryError);assert.ok(category?.id)
const{data:templates,error:templateError}=await fixture.from('servicios').select('direccion_cliente,zona,ubicacion_cliente').eq('cliente_id',CLIENT).not('ubicacion_cliente','is',null).order('created_at',{ascending:false}).limit(1)
assert.ifError(templateError);const template=templates?.[0];assert.ok(template?.ubicacion_cliente,'CLIENT_LOCATION_TEMPLATE_REQUIRED')

const baseMetadata={readiness_fixture:'admin-assignment-payment-guard',readiness_sha:sha}
const{data:service,error:createError}=await fixture.from('servicios').insert({
 cliente_id:CLIENT,categoria_id:category.id,estado:'borrador',descripcion:'UGO TEST asignación administrativa segura',
 direccion_cliente:template.direccion_cliente||'UGO TEST',zona:template.zona||null,ubicacion_cliente:template.ubicacion_cliente,
 tarifa:120,moneda:'BRL',ambiente:'demo',metadata:baseMetadata
}).select('id').single()
assert.ifError(createError);assert.ok(service?.id)
const serviceId=service.id
let cleanup=false
try{
 const clear=await fixture.from('servicios').update({metadata:baseMetadata}).eq('id',serviceId);assert.ifError(clear.error)
 const missingPayment=await adminUser.from('servicios').update({proveedor_id:provider.usuario_id}).eq('id',serviceId).select('id,estado,proveedor_id').single()
 assert.ok(missingPayment.error,'ADMIN_ASSIGNMENT_WITHOUT_PAYMENT_MUST_FAIL')
 assert.match(String(missingPayment.error.message||''),/forma de pago/i)

 const setPaymentNoLocation=await fixture.from('servicios').update({metadata:{...baseMetadata,requested_payment_method:'pix',payment_method:'pix',payment_selected_before_order:true},ubicacion_cliente:null}).eq('id',serviceId);assert.ifError(setPaymentNoLocation.error)
 const missingLocation=await adminUser.from('servicios').update({proveedor_id:provider.usuario_id}).eq('id',serviceId).select('id').single()
 assert.ok(missingLocation.error,'ADMIN_ASSIGNMENT_WITHOUT_LOCATION_MUST_FAIL')
 assert.match(String(missingLocation.error.message||''),/ubicación/i)

 const restoreLocation=await fixture.from('servicios').update({ubicacion_cliente:template.ubicacion_cliente}).eq('id',serviceId);assert.ifError(restoreLocation.error)
 const assigned=await adminUser.from('servicios').update({proveedor_id:provider.usuario_id}).eq('id',serviceId).select('id,estado,proveedor_id,metadata').single()
 assert.ifError(assigned.error);assert.equal(assigned.data?.proveedor_id,provider.usuario_id);assert.equal(assigned.data?.estado,'asignado');assert.equal(assigned.data?.metadata?.requested_payment_method,'pix')

 await fs.mkdir('artifacts',{recursive:true})
 await fs.writeFile('artifacts/admin-assignment-payment-guard-runtime.json',JSON.stringify({
  readiness_id:'admin-assignment-payment-guard',sha,environment:'UGO TEST',production_touched:false,
  service_id:serviceId,provider_id:provider.usuario_id,category_slug:category.slug,
  without_payment_rejected:true,without_location_rejected:true,complete_assignment_state:assigned.data.estado,
  complete_assignment_provider_id:assigned.data.proveedor_id,result:'PASS',completed_at:new Date().toISOString()
 },null,2)+'\n')
}finally{
 await fixture.from('notificaciones').delete().contains('datos',{servicio_id:serviceId})
 await fixture.from('servicio_estado_eventos').delete().eq('servicio_id',serviceId)
 await fixture.from('ofertas_servicio').delete().eq('servicio_id',serviceId)
 const{data:pays}=await fixture.from('pagos').select('id').eq('servicio_id',serviceId)
 for(const pay of pays||[])await fixture.from('deudas_ugo_proveedor').delete().eq('pago_id',pay.id)
 await fixture.from('pagos').delete().eq('servicio_id',serviceId)
 await fixture.from('servicios').delete().eq('id',serviceId)
 const{data:left}=await fixture.from('servicios').select('id').eq('id',serviceId).maybeSingle();cleanup=!left
}
assert.equal(cleanup,true,'ADMIN_ASSIGNMENT_FIXTURE_CLEANUP_REQUIRED')
const proof=JSON.parse(await fs.readFile('artifacts/admin-assignment-payment-guard-runtime.json','utf8'));proof.cleanup_ok=true
await fs.writeFile('artifacts/admin-assignment-payment-guard-runtime.json',JSON.stringify(proof,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,service_id:serviceId,provider_id:provider.usuario_id}))
