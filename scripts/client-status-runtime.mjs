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

const {data:rows,error:findError}=await admin.from('servicios')
 .select('id,numero,estado,cliente_id,proveedor_id')
 .eq('cliente_id',login.user.id)
 .not('proveedor_id','is',null)
 .order('created_at',{ascending:false})
 .limit(1)
assert.ifError(findError)
const fixture=rows?.[0]
assert.ok(fixture?.id&&fixture?.proveedor_id,'ASSIGNED_CLIENT_SERVICE_FIXTURE_REQUIRED')
const originalState=String(fixture.estado||'')
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
let restored=false
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
 const {error:restoreError}=await admin.from('servicios').update({estado:originalState}).eq('id',fixture.id).eq('cliente_id',login.user.id)
 if(!restoreError){
  const {data}=await admin.from('servicios').select('estado').eq('id',fixture.id).single()
  restored=String(data?.estado||'')===originalState
 }
 await page.close().catch(()=>{})
 await browser.close().catch(()=>{})
 await auth.auth.signOut().catch(()=>{})
}

assert.equal(restored,true,'TEST_FIXTURE_RESTORE_REQUIRED')
assert.deepEqual(pageErrors,[],'runtime page errors detected')
assert.equal(transitions.length,sequence.length,'full lifecycle runtime proof required')
const evidence={
 readiness_id:'client-status',
 task_id:'readiness-client-status',
 environment:'UGO TEST',
 production_touched:false,
 sha,
 service_id:fixture.id,
 original_state:originalState,
 sequence:transitions,
 restored,
 page_errors:pageErrors,
 result:'PASS',
 completed_at:new Date().toISOString(),
}
await fs.writeFile('artifacts/client-status-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,service_id:fixture.id,states:transitions.map(x=>x.state),restored}))
