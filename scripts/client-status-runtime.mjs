import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||''
const password=process.env.UGO_TEST_CLIENT_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceRole&&email&&password&&sha,'CLIENT_STATUS_RUNTIME_INPUTS_REQUIRED')

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_CLIENT_SESSION_REQUIRED')

const {data:templates,error:templateError}=await admin.from('servicios')
 .select('categoria_id,cliente_id,proveedor_id,descripcion,urgencia,direccion_cliente,zona,tarifa,comision_ugo,ganancia_proveedor,moneda,ubicacion_cliente,metadata')
 .eq('cliente_id',login.user.id)
 .not('proveedor_id','is',null)
 .order('created_at',{ascending:false})
 .limit(1)
assert.ifError(templateError)
const template=templates?.[0]
assert.ok(template?.proveedor_id&&template?.categoria_id,'CLIENT_STATUS_TEMPLATE_SERVICE_REQUIRED')

const readinessTag='client-status:'+sha
const metadata={
 ...(template.metadata&&typeof template.metadata==='object'?template.metadata:{}),
 readiness_fixture:'client-status',
 readiness_sha:sha,
 readiness_tag:readinessTag,
}
const insertRow={
 cliente_id:login.user.id,
 proveedor_id:template.proveedor_id,
 categoria_id:template.categoria_id,
 estado:'asignado',
 programado_para:new Date(Date.now()+24*60*60*1000).toISOString(),
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

const sequence=[
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
try{
 await page.goto(base+'/?app=client&serviceId='+encodeURIComponent(fixture.id),{waitUntil:'domcontentloaded'})
 await page.getByRole('dialog',{name:'Detalle del pedido'}).waitFor({state:'visible',timeout:20000})
 for(const [state,stage] of sequence){
  const {error:updateError}=await admin.from('servicios').update({estado:state}).eq('id',fixture.id).eq('cliente_id',login.user.id)
  assert.ifError(updateError)
  let backendState=''
  for(let attempt=0;attempt<30;attempt++){
   const {data,error}=await admin.from('servicios').select('estado').eq('id',fixture.id).single()
   assert.ifError(error)
   backendState=String(data?.estado||'')
   if(backendState===state)break
   await new Promise(resolve=>setTimeout(resolve,250))
  }
  assert.equal(backendState,state,'backend state mismatch for '+state)
  const timeline=page.locator('[data-service-state="'+state+'"][data-current-stage="'+stage+'"]').first()
  await timeline.waitFor({state:'visible',timeout:15000})
  const labels=await timeline.locator('small').allTextContents()
  assert.deepEqual(labels,['Asignado','Aceptado','En camino','Llegó','Trabajando','Finalizado'])
  transitions.push({service_id:fixture.id,state,stage,backend_state:backendState,ui_state:await timeline.getAttribute('data-service-state'),ui_stage:await timeline.getAttribute('data-current-stage'),labels,result:'PASS'})
 }
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
}

assert.equal(cleanup.ok,true,'DISPOSABLE_TEST_FIXTURE_CLEANUP_REQUIRED')
assert.deepEqual(pageErrors,[],'runtime page errors detected')
assert.equal(transitions.length,sequence.length,'full lifecycle runtime proof required')
const evidence={
 readiness_id:'client-status',
 task_id:'readiness-client-status',
 environment:'UGO TEST',
 production_touched:false,
 sha,
 service_id:fixture.id,
 fixture:'disposable',
 sequence:transitions,
 cleanup,
 cleanup_ok:cleanup.ok,
 page_errors:pageErrors,
 result:'PASS',
 completed_at:new Date().toISOString(),
}
await fs.writeFile('artifacts/client-status-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,service_id:fixture.id,states:transitions.map(x=>x.state),cleanup}))
