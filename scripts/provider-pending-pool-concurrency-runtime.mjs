import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'

// Real concurrent PostgREST calls, with separate authenticated providers.
// All entities are short-lived demo fixtures, strictly in UGO TEST.
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY
assert.equal(url,TEST_URL,'REFUSE_NON_TEST_SUPABASE')
assert.ok(anon&&serviceKey,'TEST_CREDENTIALS_REQUIRED')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=crypto.randomUUID()
const password='UGO-TEST-'+crypto.randomBytes(18).toString('hex')+'!'
const lat=-27.438,lng=-48.477
const ownedUsers=[],ownedServices=[]
const providers=[]
let client=null
const evidence={environment:'UGO TEST',run:token,result:'FAIL',iterations:[],production_touched:false}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function checked(action,label){
 for(let attempt=0;attempt<3;attempt++){
  const {data,error}=await action()
  if(!error)return data
  if(error.code!=='57014'||attempt===2)throw new Error(label+': '+error.message)
  await pause((attempt+1)*1000)
 }
}
async function mk(kind,catId){
 const role=kind.startsWith('proveedor')?'proveedor':'cliente'
 const email='ugo-pool-'+kind+'-'+token+'@example.test'
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:'UGO pool concurrency TEST',tipo:role}})
 if(created.error)throw created.error
 const id=created.data.user.id
 ownedUsers.push(id)
 await checked(()=>admin.from('usuarios').upsert({id,nombre:'UGO Pool TEST '+kind,tipo:role,activo:true,es_demo:true,online:role==='proveedor'},{onConflict:'id'}),'user setup')
 if(role==='proveedor'){
  await checked(()=>admin.from('perfiles_proveedor').upsert({
   usuario_id:id,estado_verificacion:'verificado',online:true,disponible:true,
   onboarding_completo_at:new Date().toISOString(),termos_aceitos_at:new Date().toISOString(),
   termos_versao:'2026-09-04',categoria_principal_id:catId,tarifa_base:100,
   disponibilidad_horaria:JSON.stringify({receive24h:true})
  },{onConflict:'usuario_id'}),'provider setup')
 }
 const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const login=await db.auth.signInWithPassword({email,password})
 if(login.error)throw login.error
 assert.equal(login.data.user.id,id)
 if(role==='proveedor')await checked(()=>db.rpc('activar_disponibilidad_proveedor',{
  p_lat:lat,p_lng:lng,p_captured_at:new Date().toISOString(),p_accuracy_m:10
 }),'provider GPS setup')
 return {id,db}
}
async function createService(catId,iteration){
 const max=await checked(()=>admin.from('servicios').select('numero').order('numero',{ascending:false}).limit(1).single(),'number seed')
 const id=crypto.randomUUID()
 const row={id,numero:Number(max.numero)+100001+iteration,cliente_id:client.id,
  categoria_id:catId,estado:'buscando',descripcion:'UGO TEST exclusive pending pool '+token,
  tarifa:100,ambiente:'demo',metadata:{readiness_id:'pending-pool-concurrency',token,ephemeral:true,
   request_draft_id:crypto.randomUUID(),payment_method:'efectivo',requested_payment_method:'efectivo'}}
 await checked(()=>admin.from('servicios').insert(row),'fixture insert')
 ownedServices.push(id)
 await checked(()=>client.db.rpc('guardar_ubicacion_servicio_cliente',{
  p_servicio_id:id,p_lat:lat,p_lng:lng
 }),'client owned pickup')
 await checked(()=>admin.from('servicios').update({created_at:new Date(Date.now()-6*60_000).toISOString()}).eq('id',id),'fixture age')
 return id
}
async function removeService(id){
 const owned=await checked(()=>admin.from('servicios').select('metadata,cliente_id').eq('id',id).maybeSingle(),'check service ownership')
 if(!owned)return
 assert.equal(owned.metadata?.token,token,'REFUSE_FOREIGN_SERVICE_DELETE')
 assert.equal(owned.metadata?.ephemeral,true,'REFUSE_REAL_SERVICE_DELETE')
 assert.equal(owned.cliente_id,client?.id,'REFUSE_NON_TEST_CLIENT')
 await checked(()=>admin.from('pagos').delete().eq('servicio_id',id),'payment cleanup')
 await checked(()=>admin.from('ofertas_servicio').delete().eq('servicio_id',id),'offers cleanup')
 await checked(()=>admin.from('servicios').delete().eq('id',id),'service cleanup')
}
async function cleanup(){
 const failures=[]
 for(const id of [...ownedServices].reverse())try{await removeService(id)}catch(e){failures.push('service '+id+': '+e.message)}
 for(const id of [...ownedUsers].reverse()){
  for(const [table,col] of [['notificaciones','usuario_id'],['perfiles_proveedor','usuario_id'],['perfiles_cliente','usuario_id'],['usuarios','id']]){
   try{await checked(()=>admin.from(table).delete().eq(col,id),table+' cleanup')}catch(e){failures.push(table+': '+e.message)}
  }
  try{const {error}=await admin.auth.admin.deleteUser(id);if(error)throw error}catch(e){failures.push('auth cleanup: '+e.message)}
 }
 return failures
}
try{
 const cat=await checked(()=>admin.from('categorias').select('id').eq('activa',true).limit(1).single(),'category')
 client=await mk('cliente',cat.id)
 providers.push(await mk('proveedor-a',cat.id),await mk('proveedor-b',cat.id))
 const anonymous=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 for(let iteration=0;iteration<3;iteration++){
  const id=await createService(cat.id,iteration)
  const denied=await anonymous.rpc('tomar_pedido_pendiente',{p_servicio_id:id})
  assert.ok(denied.error,'ANON_MUST_BE_DENIED')
  // Refresh physical-position simulation for both independent TEST identities.
  await Promise.all(providers.map(p=>checked(()=>p.db.rpc('publicar_ubicacion_disponibilidad_proveedor',{
   p_lat:lat,p_lng:lng,p_captured_at:new Date().toISOString(),p_accuracy_m:10
  }),'refresh TEST GPS')))
  const eligible=await Promise.all(providers.map(p=>p.db.rpc('obtener_pedidos_pendientes_proveedor')))
  for(let n=0;n<2;n++){
   assert.ifError(eligible[n].error)
   assert.ok(eligible[n].data?.some(row=>row.id===id),'PROVIDER_'+n+'_NOT_ELIGIBLE')
  }
  // Actual concurrent network requests, not sequential PGlite calls.
  const outcomes=await Promise.all(providers.map(p=>p.db.rpc('tomar_pedido_pendiente',{p_servicio_id:id})))
  const winners=outcomes.map((o,n)=>!o.error&&o.data?.proveedor_id===providers[n].id?n:-1).filter(n=>n>=0)
  assert.equal(winners.length,1,'EXACTLY_ONE_WINNER_REQUIRED')
  assert.ok(outcomes[1-winners[0]].error,'LOSER_MUST_BE_REJECTED')
  const winner=providers[winners[0]]
  const persisted=await checked(()=>admin.from('servicios').select('id,estado,proveedor_id').eq('id',id).single(),'persisted owner')
  assert.equal(persisted.estado,'asignado')
  assert.equal(persisted.proveedor_id,winner.id)
  const offers=await checked(()=>admin.from('ofertas_servicio').select('id,proveedor_id,estado').eq('servicio_id',id),'persisted offers')
  assert.equal(offers.filter(o=>o.estado==='aceptada').length,1,'EXACTLY_ONE_ACCEPTED_OFFER')
  assert.equal(offers.find(o=>o.estado==='aceptada')?.proveedor_id,winner.id)
  const retry=await winner.db.rpc('tomar_pedido_pendiente',{p_servicio_id:id})
  assert.ifError(retry.error)
  assert.equal(retry.data?.proveedor_id,winner.id,'WINNER_RETRY_IDEMPOTENT')
  evidence.iterations.push({iteration:iteration+1,service_id:id,winning_provider:winners[0],results:'ONE_WINNER',idempotent:true})
  await removeService(id)
 }
 evidence.result='PASS'
}catch(error){
 evidence.error=error instanceof Error?error.message:String(error)
 throw error
}finally{
 const failures=await cleanup()
 evidence.cleanup_failures=failures
 await mkdir('artifacts',{recursive:true})
 await writeFile('artifacts/pending-pool-concurrency.json',JSON.stringify(evidence,null,2)+'\n')
 if(failures.length)throw new Error('TEST_FIXTURE_CLEANUP_FAILED: '+failures.join(' | '))
}
