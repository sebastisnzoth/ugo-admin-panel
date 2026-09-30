import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const CLIENT='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const PROVIDER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||'',password=process.env.UGO_TEST_CLIENT_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceRole&&email&&password&&sha,'CLIENT_PAYMENT_RUNTIME_INPUTS_REQUIRED')
const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await client.auth.signInWithPassword({email,password})
assert.ifError(loginError);assert.equal(login.user?.id,CLIENT,'TEST_CLIENT_ID_MISMATCH')

const{data:templates,error:templateError}=await admin.from('servicios').select('categoria_id,direccion_cliente,zona,ubicacion_cliente').eq('cliente_id',CLIENT).order('created_at',{ascending:false}).limit(1)
assert.ifError(templateError);const template=templates?.[0];assert.ok(template?.categoria_id,'PAYMENT_TEMPLATE_REQUIRED')
const metadata={readiness_fixture:'client-payment',readiness_sha:sha,trabajo_aprobado_at:new Date().toISOString(),requested_payment_method:'efectivo'}
const{data:service,error:createError}=await admin.from('servicios').insert({
 cliente_id:CLIENT,proveedor_id:PROVIDER,categoria_id:template.categoria_id,estado:'esperando_aprobacion',
 descripcion:'UGO TEST client-payment '+sha.slice(0,12),urgencia:false,direccion_cliente:template.direccion_cliente||'UGO TEST',
 zona:template.zona||null,tarifa:120,comision_ugo:18,ganancia_proveedor:102,moneda:'BRL',ambiente:'demo',
 ubicacion_cliente:template.ubicacion_cliente||null,metadata
}).select('id').single()
assert.ifError(createError);assert.ok(service?.id,'PAYMENT_FIXTURE_REQUIRED')
let paymentId=null
let cleanupOk=false
try{
 const{data:payment,error:payError}=await admin.from('pagos').insert({
  servicio_id:service.id,cliente_id:CLIENT,proveedor_id:PROVIDER,procesador:'efectivo',metodo:'efectivo',modelo_pago:'presencial',
  ambiente:'demo',monto_bruto:120,comision_ugo:18,ganancia_proveedor:102,moneda:'BRL',estado:'pendiente'
 }).select('id').single()
 assert.ifError(payError);paymentId=payment.id
 const first=await client.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:service.id});assert.ifError(first.error)
 const second=await client.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:service.id});assert.ifError(second.error)
 const[{data:s},{data:p},{data:debts},{data:audits}]=await Promise.all([
  admin.from('servicios').select('estado,metadata').eq('id',service.id).single(),
  admin.from('pagos').select('id,estado,metodo,monto_bruto,comision_ugo').eq('id',paymentId).single(),
  admin.from('deudas_ugo_proveedor').select('id,pago_id,servicio_id,comision_ugo,estado,ambiente').eq('pago_id',paymentId),
  admin.from('audit_log').select('id,evento,actor_id,entidad_id,detalles').eq('evento','client.cash_payment.confirmed').eq('entidad_id',service.id)
 ])
 assert.equal(s?.estado,'completado');assert.equal(p?.estado,'liberado');assert.equal(p?.metodo,'efectivo')
 assert.equal(debts?.length,1,'ONE_CASH_DEBT_REQUIRED');assert.equal(Number(debts[0].comision_ugo),18)
 assert.equal(audits?.length,1,'ONE_CASH_AUDIT_REQUIRED');assert.equal(audits[0].actor_id,CLIENT)
 await fs.mkdir('artifacts',{recursive:true})
 await fs.writeFile('artifacts/client-payment-runtime.json',JSON.stringify({
  readiness_id:'client-payment',task_id:'readiness-client-payment',environment:'UGO TEST',production_touched:false,sha,
  service_id:service.id,payment_id:paymentId,service_state:s.estado,payment_state:p.estado,
  repeated_confirmation:true,payment_rows:1,debt_rows:debts.length,audit_rows:audits.length,
  debt:{commission:Number(debts[0].comision_ugo),state:debts[0].estado,environment:debts[0].ambiente},
  audit:{event:audits[0].evento,actor_id:audits[0].actor_id},result:'PASS',completed_at:new Date().toISOString()
 },null,2)+'\n')
}finally{
 if(paymentId){await admin.from('deudas_ugo_proveedor').delete().eq('pago_id',paymentId);await admin.from('audit_log').delete().eq('entidad_id',service.id).eq('evento','client.cash_payment.confirmed');await admin.from('notificaciones').delete().contains('datos',{servicio_id:service.id});await admin.from('pagos').delete().eq('id',paymentId)}
 await admin.from('servicios').delete().eq('id',service.id)
 const{data:left}=await admin.from('servicios').select('id').eq('id',service.id).maybeSingle();cleanupOk=!left
}
assert.equal(cleanupOk,true,'PAYMENT_FIXTURE_CLEANUP_REQUIRED')
const proof=JSON.parse(await fs.readFile('artifacts/client-payment-runtime.json','utf8'));proof.cleanup_ok=true
await fs.writeFile('artifacts/client-payment-runtime.json',JSON.stringify(proof,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,service_id:service.id,payment_id:paymentId}))
