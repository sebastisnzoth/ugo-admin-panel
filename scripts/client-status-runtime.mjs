import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const TEST_PROVIDER_ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||''
const password=process.env.UGO_TEST_CLIENT_PASSWORD||''
const providerEmail=process.env.UGO_TEST_PROVIDER_EMAIL||''
const providerPassword=process.env.UGO_TEST_PROVIDER_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceRole&&email&&password&&providerEmail&&providerPassword&&sha,'CLIENT_STATUS_RUNTIME_INPUTS_REQUIRED')

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const provider=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})

const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_CLIENT_SESSION_REQUIRED')
const {data:providerLogin,error:providerLoginError}=await provider.auth.signInWithPassword({email:providerEmail,password:providerPassword})
assert.ifError(providerLoginError)
assert.ok(providerLogin.session&&providerLogin.user,'UGO_TEST_PROVIDER_SESSION_REQUIRED')
assert.equal(providerLogin.user.id,TEST_PROVIDER_ID,'UGO_TEST_PROVIDER_ID_MISMATCH')

const {data:templates,error:templateError}=await admin.from('servicios')
 .select('categoria_id,cliente_id,descripcion,urgencia,direccion_cliente,zona,tarifa,comision_ugo,ganancia_proveedor,moneda,ubicacion_cliente,metadata')
 .eq('cliente_id',login.user.id)
 .order('created_at',{ascending:false})
 .limit(1)
assert.ifError(templateError)
const template=templates?.[0]
assert.ok(template?.categoria_id,'CLIENT_STATUS_TEMPLATE_SERVICE_REQUIRED')

const readinessTag='client-status:'+sha
const metadata={
 ...(template.metadata&&typeof template.metadata==='object'?template.metadata:{}),
 readiness_fixture:'client-status',
 readiness_sha:sha,
 readiness_tag:readinessTag,
}
const insertRow={
 cliente_id:login.user.id,
 proveedor_id:TEST_PROVIDER_ID,
 categoria_id:template.categoria_id,
 estado:'asignado',
 programado_para:new Date(Date.now()+30*60*1000).toISOString(),
 descripcion:'UGO TEST readiness client-status '+sha.slice(0,12),
 urgencia:false,
 direccion_cliente:template.direccion_cliente||'UGO TEST',
 zona:template.zona||null,
 tarifa:template.tarifa??0,
 comision_ugo:template.comision_ugo??0,
 ganancia_proveedor:template.ganancia_proveedor??0,
 moneda:template.moneda||'BRL',
 ubicacion_cliente:template.ubicacion_cliente||null,
 metadata,
}
const {data:fixture,error:createError}=await admin.from('servicios')
 .insert(insertRow)
 .select('id,numero,estado,cliente_id,proveedor_id')
 .single()
assert.ifError(createError)
assert.ok(fixture?.id&&fixture?.proveedor_id,'DISPOSABLE_CLIENT_STATUS_FIXTURE_REQUIRED')

const expected=[
 ['asignado','accepted'],
 ['en_camino','route'],
 ['llegado','arrived'],
 ['en_progreso','working'],
 ['esperando_aprobacion','finished'],
 ['completado','finished'],
]

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:390,height:844}})
const pageErrors=[]
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)

const transitions=[]
let cleanup={ok:false,mode:'none',error:null}
async function backendState(){
 const {data,error}=await admin.from('servicios').select('estado').eq('id',fixture.id).single()
 assert.ifError(error)
 return String(data?.estado||'')
}
async function expectUi(state,stage){
 let persisted=''
 for(let attempt=0;attempt<30;attempt++){
  persisted=await backendState()
  if(persisted===state)break
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 assert.equal(persisted,state,'backend state mismatch for '+state)
 const timeline=page.locator('[data-service-state="'+state+'"][data-current-stage="'+stage+'"]').first()
 try{
  await timeline.waitFor({state:'visible',timeout:15000})
 }catch(error){
  const clientRead=await auth.from('servicios').select('id,estado,cliente_id,proveedor_id,programado_para').eq('id',fixture.id).maybeSingle()
  const diagnostic=await page.evaluate(()=>({
   body:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,2400),
   detail:Boolean(document.querySelector('[aria-label="Detalle del pedido"]')),
   loading:Boolean(document.querySelector('.ugo-history-empty')),
   tracking:Boolean(document.querySelector('.ugo-live-tracking')),
   timelines:[...document.querySelectorAll('[data-service-state]')].map(node=>({
    state:node.getAttribute('data-service-state'),
    stage:node.getAttribute('data-current-stage'),
    text:(node.textContent||'').replace(/\s+/g,' ').trim()
   })),
  })).catch(()=>({body:'EVALUATION_FAILED',detail:false,loading:false,tracking:false,timelines:[]}))
  await page.screenshot({path:'artifacts/client-status-failure-'+state+'.png',fullPage:true}).catch(()=>{})
  await fs.writeFile('artifacts/client-status-diagnostic-'+state+'.json',JSON.stringify({
   state,stage,service_id:fixture.id,admin_state:persisted,client_read:clientRead,diagnostic,page_errors:pageErrors
  },null,2)+'\n').catch(()=>{})
  throw error
 }
 const labels=await timeline.locator('small').allTextContents()
 assert.deepEqual(labels,['Asignado','Aceptado','En camino','Llegó','Trabajando','Finalizado'])
 transitions.push({service_id:fixture.id,state,stage,backend_state:persisted,ui_state:await timeline.getAttribute('data-service-state'),ui_stage:await timeline.getAttribute('data-current-stage'),labels,result:'PASS'})
}

try{
 await page.goto(base+'/?app=client&serviceId='+encodeURIComponent(fixture.id),{waitUntil:'domcontentloaded'})
 await page.getByRole('dialog',{name:'Detalle del pedido'}).waitFor({state:'visible',timeout:20000})
 await expectUi('asignado','accepted')

 const {error:cashError}=await auth.rpc('seleccionar_pago_efectivo',{p_servicio_id:fixture.id})
 assert.ifError(cashError)
 const {data:selectedPayment,error:paymentReadError}=await admin.from('pagos')
  .select('id,metodo,estado')
  .eq('servicio_id',fixture.id)
  .order('created_at',{ascending:false})
  .limit(1)
  .maybeSingle()
 assert.ifError(paymentReadError)
 assert.equal(selectedPayment?.metodo,'efectivo','CASH_PAYMENT_SELECTION_REQUIRED')

 const {error:routeError}=await provider.rpc('avanzar_servicio',{p_servicio_id:fixture.id,p_estado:'en_camino'})
 assert.ifError(routeError)
 await expectUi('en_camino','route')

 const {data:tracking,error:trackingError}=await auth.rpc('obtener_tracking_servicio_cliente',{p_servicio_id:fixture.id})
 assert.ifError(trackingError)
 const trackingRow=Array.isArray(tracking)?tracking[0]:tracking
 const clientLat=Number(trackingRow?.client_lat),clientLng=Number(trackingRow?.client_lng)
 assert.ok(Number.isFinite(clientLat)&&Number.isFinite(clientLng),'CLIENT_LOCATION_REQUIRED_FOR_ARRIVAL')

 const capturedAt=new Date().toISOString()
 const {data:published,error:publishError}=await provider.rpc('publicar_ubicacion_proveedor',{
  p_servicio_id:fixture.id,
  p_lat:clientLat,
  p_lng:clientLng,
  p_captured_at:capturedAt,
  p_accuracy_m:10,
 })
 assert.ifError(publishError)
 assert.equal(published?.status,'published','GPS_PUBLISH_REQUIRED')

 const {data:arrival,error:arrivalError}=await provider.rpc('marcar_llegada_proveedor',{p_servicio_id:fixture.id})
 assert.ifError(arrivalError)
 assert.equal(arrival?.status,'arrived','GPS_VALIDATED_ARRIVAL_REQUIRED')
 await expectUi('llegado','arrived')

 const {error:workError}=await provider.rpc('avanzar_servicio',{p_servicio_id:fixture.id,p_estado:'en_progreso'})
 assert.ifError(workError)
 await expectUi('en_progreso','working')

 const {error:finishError}=await provider.rpc('avanzar_servicio',{p_servicio_id:fixture.id,p_estado:'esperando_aprobacion'})
 assert.ifError(finishError)
 await expectUi('esperando_aprobacion','finished')

 const {error:completeError}=await admin.from('servicios').update({estado:'completado'}).eq('id',fixture.id).eq('cliente_id',login.user.id)
 assert.ifError(completeError)
 await expectUi('completado','finished')

 await page.screenshot({path:'artifacts/client-status-runtime.png',fullPage:true})
}finally{
 await page.close().catch(()=>{})
 await browser.close().catch(()=>{})
 try{
  await admin.from('ofertas_servicio').delete().eq('servicio_id',fixture.id)
  await admin.from('pagos').delete().eq('servicio_id',fixture.id)
  const {error:deleteError}=await admin.from('servicios').delete().eq('id',fixture.id).eq('cliente_id',login.user.id)
  if(!deleteError){
   const {data:deleted,error:checkError}=await admin.from('servicios').select('id').eq('id',fixture.id).maybeSingle()
   if(!checkError&&!deleted)cleanup={ok:true,mode:'deleted',error:null}
  }
  if(!cleanup.ok){
   const {error:cancelError}=await admin.from('servicios').update({estado:'cancelado',proveedor_id:null,metadata:{...metadata,readiness_cleanup:'cancelled'}}).eq('id',fixture.id).eq('cliente_id',login.user.id)
   cleanup={ok:!cancelError,mode:cancelError?'failed':'cancelled',error:cancelError?String(cancelError.message||cancelError):null}
  }
 }catch(error){
  cleanup={ok:false,mode:'failed',error:String(error?.message||error)}
 }
 await auth.auth.signOut().catch(()=>{})
 await provider.auth.signOut().catch(()=>{})
}

assert.equal(cleanup.ok,true,'DISPOSABLE_TEST_FIXTURE_CLEANUP_REQUIRED')
assert.deepEqual(pageErrors,[],'runtime page errors detected')
assert.deepEqual(transitions.map(x=>x.state),expected.map(x=>x[0]),'full lifecycle runtime proof required')
const evidence={
 readiness_id:'client-status',
 task_id:'readiness-client-status',
 environment:'UGO TEST',
 production_touched:false,
 sha,
 service_id:fixture.id,
 fixture:'disposable',
 transition_sources:{
  asignado:'fixture_create',
  en_camino:'provider.avanzar_servicio',
  llegado:'provider.publicar_ubicacion_proveedor+marcar_llegada_proveedor',
  en_progreso:'provider.avanzar_servicio',
  esperando_aprobacion:'provider.avanzar_servicio',
  completado:'service_role_test_finalize',
 },
 sequence:transitions,
 cleanup,
 cleanup_ok:cleanup.ok,
 page_errors:pageErrors,
 result:'PASS',
 completed_at:new Date().toISOString(),
}
await fs.writeFile('artifacts/client-status-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,service_id:fixture.id,states:transitions.map(x=>x.state),cleanup}))
