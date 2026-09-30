import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&sha,'RUNTIME_INPUTS_REQUIRED')

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
async function login(email,password){
  const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await sb.auth.signInWithPassword({email,password})
  assert.ifError(error); assert.ok(data.user?.id,'AUTH_REQUIRED')
  return {sb,id:data.user.id}
}
const [{sb:client,id:clientId},{sb:provider,id:providerId}]=await Promise.all([
  login(process.env.UGO_TEST_CLIENT_EMAIL||'',process.env.UGO_TEST_CLIENT_PASSWORD||''),
  login(process.env.UGO_TEST_PROVIDER_EMAIL||'',process.env.UGO_TEST_PROVIDER_PASSWORD||'')
])

await fs.mkdir('artifacts',{recursive:true})
const out={readiness_id:'cross-idempotency',task_id:'readiness-cross-idempotency',sha,environment:'UGO TEST',production_touched:false,status:'RUNNING',acceptance:{},payment_close:{},rating:{},started_at:new Date().toISOString()}
const save=()=>fs.writeFile('artifacts/readiness-cross-idempotency-runtime.json',JSON.stringify(out,null,2)+'\n')
await save()

const fixtureIds=[]
async function cleanup(serviceId){
  if(!serviceId)return
  await admin.from('resenas').delete().eq('servicio_id',serviceId)
  const {data:payRows}=await admin.from('pagos').select('id').eq('servicio_id',serviceId)
  for(const p of payRows||[])await admin.from('deudas_ugo_proveedor').delete().eq('pago_id',p.id)
  await admin.from('audit_log').delete().eq('entidad_id',serviceId)
  await admin.from('notificaciones').delete().contains('datos',{servicio_id:serviceId})
  await admin.from('pagos').delete().eq('servicio_id',serviceId)
  await admin.from('ofertas_servicio').delete().eq('servicio_id',serviceId)
  await admin.from('servicios').delete().eq('id',serviceId)
}

try{
  const {data:cat,error:catError}=await admin.from('categorias').select('id').eq('activa',true).limit(1).single()
  assert.ifError(catError)

  const {data:s1,error:s1Error}=await admin.from('servicios').insert({
    cliente_id:clientId,categoria_id:cat.id,estado:'buscando',
    programado_para:new Date(Date.now()+72*3600000).toISOString(),
    descripcion:'UGO TEST concurrent acceptance '+sha.slice(0,12),urgencia:false,
    tarifa:100,moneda:'BRL',ambiente:'demo',
    metadata:{readiness_fixture:'cross-idempotency',phase:'acceptance',duration_minutes:60}
  }).select('id').single()
  assert.ifError(s1Error); fixtureIds.push(s1.id)

  const lat=-27.4167917,lng=-48.4242297
  let r=await client.rpc('guardar_ubicacion_servicio_cliente',{p_servicio_id:s1.id,p_lat:lat,p_lng:lng}); assert.ifError(r.error)
  r=await provider.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:lat,p_lng:lng,p_captured_at:new Date().toISOString(),p_accuracy_m:10}); assert.ifError(r.error)
  r=await client.rpc('iniciar_matching_dirigido',{p_servicio_id:s1.id,p_proveedor_id:providerId}); assert.ifError(r.error)
  const offers=await provider.rpc('obtener_ofertas_proveedor'); assert.ifError(offers.error)
  const offer=(offers.data||[]).find(x=>String(x.servicio_id)===s1.id); assert.ok(offer?.id,'OFFER_REQUIRED')

  const accepts=await Promise.all([
    provider.rpc('aceptar_oferta',{p_oferta_id:offer.id}),
    provider.rpc('aceptar_oferta',{p_oferta_id:offer.id})
  ])
  accepts.forEach(x=>assert.ifError(x.error))
  const accepted=await admin.from('servicios').select('id,estado,proveedor_id').eq('id',s1.id)
  const acceptedOffers=await admin.from('ofertas_servicio').select('id').eq('servicio_id',s1.id).eq('estado','aceptada')
  assert.ifError(accepted.error);assert.ifError(acceptedOffers.error)
  assert.equal(accepted.data.length,1);assert.equal(accepted.data[0].estado,'asignado');assert.equal(accepted.data[0].proveedor_id,providerId);assert.equal(acceptedOffers.data.length,1)
  out.acceptance={concurrent_calls:2,successful_calls:2,service_rows:1,accepted_offer_rows:1,status:'PASS'}
  await cleanup(s1.id); fixtureIds.splice(fixtureIds.indexOf(s1.id),1)

  const {data:s2,error:s2Error}=await admin.from('servicios').insert({
    cliente_id:clientId,proveedor_id:providerId,categoria_id:cat.id,estado:'esperando_aprobacion',
    programado_para:new Date(Date.now()+96*3600000).toISOString(),
    descripcion:'UGO TEST concurrent payment '+sha.slice(0,12),urgencia:false,
    tarifa:120,comision_ugo:18,ganancia_proveedor:102,moneda:'BRL',ambiente:'demo',
    metadata:{readiness_fixture:'cross-idempotency',phase:'payment-close',trabajo_aprobado_at:new Date().toISOString(),requested_payment_method:'efectivo'}
  }).select('id').single()
  assert.ifError(s2Error); fixtureIds.push(s2.id)
  const {data:payment,error:paymentError}=await admin.from('pagos').insert({
    servicio_id:s2.id,cliente_id:clientId,proveedor_id:providerId,procesador:'efectivo',metodo:'efectivo',modelo_pago:'presencial',
    ambiente:'demo',monto_bruto:120,comision_ugo:18,ganancia_proveedor:102,moneda:'BRL',estado:'pendiente'
  }).select('id').single()
  assert.ifError(paymentError)

  const closes=await Promise.all([
    client.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:s2.id}),
    client.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:s2.id})
  ])
  closes.forEach(x=>assert.ifError(x.error))
  const [sr,pr,dr,ar]=await Promise.all([
    admin.from('servicios').select('id,estado').eq('id',s2.id),
    admin.from('pagos').select('id,estado').eq('servicio_id',s2.id),
    admin.from('deudas_ugo_proveedor').select('id').eq('pago_id',payment.id),
    admin.from('audit_log').select('id').eq('evento','client.cash_payment.confirmed').eq('entidad_id',s2.id)
  ])
  ;[sr,pr,dr,ar].forEach(x=>assert.ifError(x.error))
  assert.equal(sr.data.length,1);assert.equal(sr.data[0].estado,'completado')
  assert.equal(pr.data.length,1);assert.equal(pr.data[0].estado,'liberado')
  assert.equal(dr.data.length,1);assert.equal(ar.data.length,1)
  out.payment_close={concurrent_calls:2,successful_calls:2,service_rows:1,payment_rows:1,debt_rows:1,audit_rows:1,service_state:'completado',payment_state:'liberado',status:'PASS'}

  async function raceRating(sb,autor){
    const base={servicio_id:s2.id,cliente_id:clientId,proveedor_id:providerId,puntuacion:5,autor_tipo:autor}
    const calls=await Promise.all([
      sb.from('resenas').insert({...base,comentario:'UGO concurrent A'}).select('id').single(),
      sb.from('resenas').insert({...base,comentario:'UGO concurrent B'}).select('id').single()
    ])
    const ok=calls.filter(x=>!x.error),conflict=calls.filter(x=>x.error?.code==='23505')
    assert.equal(ok.length,1);assert.equal(conflict.length,1)
    return {concurrent_calls:2,successful_calls:1,conflict_calls:1,conflict_code:'23505'}
  }
  const [clientRating,providerRating]=await Promise.all([raceRating(client,'cliente'),raceRating(provider,'proveedor')])
  const ratings=await admin.from('resenas').select('id,autor_tipo').eq('servicio_id',s2.id);assert.ifError(ratings.error)
  assert.deepEqual(ratings.data.map(x=>x.autor_tipo).sort(),['cliente','proveedor'])
  out.rating={client:clientRating,provider:providerRating,persisted_rows:ratings.data.length,conflict_feedback:'DETERMINISTIC_UNIQUE_CONFLICT',status:'PASS'}

  await cleanup(s2.id);fixtureIds.splice(fixtureIds.indexOf(s2.id),1)
  out.cleanup_ok=true;out.status='PASS';out.completed_at=new Date().toISOString();await save()
  console.log(JSON.stringify(out))
}catch(error){
  out.status='FAIL';out.failure=String(error?.message||error);out.completed_at=new Date().toISOString();await save();throw error
}finally{
  for(const id of [...fixtureIds])await cleanup(id).catch(()=>{})
  await Promise.allSettled([client.auth.signOut(),provider.auth.signOut()])
}
