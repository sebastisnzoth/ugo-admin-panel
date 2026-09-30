import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
const credentials={
  client:[process.env.UGO_TEST_CLIENT_EMAIL||'',process.env.UGO_TEST_CLIENT_PASSWORD||''],
  provider:[process.env.UGO_TEST_PROVIDER_EMAIL||'',process.env.UGO_TEST_PROVIDER_PASSWORD||''],
  admin:[process.env.UGO_TEST_ADMIN_EMAIL||'',process.env.UGO_TEST_ADMIN_PASSWORD||''],
}
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&sha,'UGO_TEST_RUNTIME_INPUTS_REQUIRED')
await fs.mkdir('artifacts',{recursive:true})
const bootstrapEvidence={task:'readiness-safe-batch-runtime',sha,environment:'UGO TEST',production_touched:false,status:'BOOTSTRAP'}
const timedFetch=(input,init={})=>fetch(input,{...init,signal:init.signal||AbortSignal.timeout(12000)})
for(const [role,[email,password]] of Object.entries(credentials))assert.ok(email&&password,role+' credentials required')

async function login(email,password){
 const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}})
 let lastError=null
 for(let attempt=1;attempt<=5;attempt++){
  try{
   const {data,error}=await sb.auth.signInWithPassword({email,password})
   if(!error&&data.session)return {sb,session:data.session}
   lastError=error||new Error('SESSION_REQUIRED')
  }catch(error){lastError=error}
  if(attempt<5)await new Promise(resolve=>setTimeout(resolve,Math.min(attempt*2000,6000)))
 }
 throw lastError||new Error('SESSION_REQUIRED')
}
const adminSb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}})
const sessions={}
try{
 for(const [role,[email,password]] of Object.entries(credentials))sessions[role]=await login(email,password)
}catch(error){
 bootstrapEvidence.status='FAIL'
 bootstrapEvidence.failure_stage='auth_bootstrap'
 bootstrapEvidence.failure=error instanceof Error?error.message:String(error)
 bootstrapEvidence.completed_at=new Date().toISOString()
 await fs.writeFile('artifacts/readiness-safe-batch-runtime.json',JSON.stringify(bootstrapEvidence,null,2)+'\n')
 throw error
}

const {data:categories,error:categoryError}=await sessions.client.sb.from('categorias').select('id,nombre,slug').limit(20)
assert.ifError(categoryError)
const category=(categories||[]).find(item=>item?.id&&item?.nombre)
assert.ok(category,'TEST_CATEGORY_REQUIRED')

const browser=await chromium.launch({headless:true})
const results={task:'readiness-safe-batch-runtime',sha,environment:'UGO TEST',hugo_action:{},fault_injection:{},performance:{},production_touched:false}

async function openRole(role,{geolocation=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:900},geolocation:geolocation?{latitude:-27.5949,longitude:-48.5482}:undefined,permissions:geolocation?['geolocation']:[]})
 const page=await context.newPage()
 const session=sessions[role].session
 await page.addInitScript(({role,session})=>{
   const key=role==='admin'?'ugo-test-admin-auth':'ugo-test-'+role+'-auth'
   localStorage.setItem(key,JSON.stringify(session))
 },{role,session})
 const started=performance.now()
 await page.goto(base+'/?app='+role,{waitUntil:'domcontentloaded',timeout:20000})
 const loadMs=Math.round(performance.now()-started)
 return {context,page,loadMs}
}
async function visible(locator,timeout=20000){await locator.waitFor({state:'visible',timeout});return locator}
async function timed(label,fn,limitMs=4000){
 const start=performance.now();await fn();const ms=Math.round(performance.now()-start)
 assert.ok(ms<=limitMs,label+' exceeded '+limitMs+'ms: '+ms+'ms')
 results.performance[label]=ms;return ms
}
async function installToolCapture(page){
 await page.waitForFunction(()=>Boolean(window.UGOVoiceBridge),null,{timeout:15000})
 await page.evaluate(()=>{
   window.__ugoToolResponses=[]
   const bridge=window.UGOVoiceBridge
   const original=bridge.sendToolResponse?.bind(bridge)
   bridge.sendToolResponse=(id,name,response)=>{
     window.__ugoToolResponses.push({id,name,response,at:Date.now()})
     try{return original?.(id,name,response)}catch{return undefined}
   }
 })
}
async function callTool(page,name,args){
 const id=name+'-'+Date.now()+'-'+Math.random().toString(16).slice(2)
 const before=await page.evaluate(()=>window.__ugoToolResponses?.length||0)
 await page.evaluate(({id,name,args})=>window.dispatchEvent(new CustomEvent('ugo:native-voice-tool-call',{detail:{id,name,args}})),{id,name,args})
 await page.waitForFunction(({id,before})=>(window.__ugoToolResponses?.length||0)>before&&window.__ugoToolResponses.some(x=>x.id===id),{id,before},{timeout:15000})
 return page.evaluate(id=>window.__ugoToolResponses.find(x=>x.id===id)?.response||null,id)
}

try{
 // 1) HUGO ACTION: isolated TEST fixture -> real Client Hugo cancellation -> persisted effect -> privileged cleanup.
 {
  const marker='READINESS-HUGO-ACTION-'+sha.slice(0,12)
  const clientId=sessions.client.session.user.id
  const futureAt=new Date(Date.now()+48*60*60*1000).toISOString()
  const {data:fixture,error:fixtureError}=await adminSb.from('servicios').insert({
    cliente_id:clientId,
    categoria_id:category.id,
    estado:'buscando',
    descripcion:marker,
    direccion_cliente:'UGO TEST isolated runtime fixture',
    urgencia:false,
    programado_para:futureAt,
    metadata:{source:'readiness-safe-batch',runtime_sha:sha,fixture:true,requested_when:'programar',scheduled_at:futureAt}
  }).select('id,estado,metadata').single()
  assert.ifError(fixtureError);assert.ok(fixture?.id,'isolated service fixture required')
  const serviceId=String(fixture.id)
  const {context,page,loadMs}=await openRole('client')
  results.performance.client_initial_load_ms=loadMs
  assert.ok(loadMs<=8000,'client initial load too slow: '+loadMs)
  try{
   await visible(page.locator('.ugo-client-root'))
   await visible(page.locator('.ugo-real-hugo'))
   await installToolCapture(page)
   const response=await callTool(page,'cancel_service',{service_id:serviceId,confirmed:true})
   assert.equal(response?.ok,true,'Hugo cancel_service must pass on isolated TEST fixture')
   const {data:after,error:afterError}=await adminSb.from('servicios').select('id,estado,metadata').eq('id',serviceId).maybeSingle()
   assert.ifError(afterError);assert.ok(after,'cancelled fixture must remain auditable before cleanup')
   assert.notEqual(String(after.estado),'buscando','Hugo cancellation effect must persist')
   results.hugo_action={
     status:'PASS',
     action:'cancel_service',
     service_id:serviceId,
     persisted_effect:true,
     before:{state:'buscando'},
     after:{state:String(after.estado)},
     tool_response:response,
     audit_trail:{runtime_sha:sha,fixture_source:after.metadata?.source||null,channel:'ugo:native-voice-tool-call',confirmed:true}
   }
  } finally {
   const {error:cleanupError}=await adminSb.from('servicios').delete().eq('id',serviceId)
   assert.ifError(cleanupError)
   const {data:gone}=await adminSb.from('servicios').select('id').eq('id',serviceId).maybeSingle()
   assert.equal(gone,null,'isolated Hugo fixture must be removed')
   results.hugo_action.cleanup_state='DELETED'
   await context.close()
  }
 }

 // 2) CROSS ERRORS: browser fault injection + API auth failure must be explicit/actionable.
 {
  const {context,page}=await openRole('client')
  try{
   await visible(page.locator('.ugo-client-root'))
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ugo:native-voice-error',{detail:{code:'session',engine:'gemini-live'}})))
   const error=page.locator('.ugo-hugo-stage-error')
   await visible(error,5000)
   const text=(await error.textContent()||'').trim()
   assert.match(text,/sesión/i)
   assert.match(text,/iniciar sesión/i)
   results.fault_injection.ui_session_error={status:'PASS',message:text}
   const api=await page.request.post(base+'/api/hugo/chat',{data:{message:'estado',role:'client'}})
   const payload=await api.json().catch(()=>({}))
   assert.equal(api.status(),401)
   const apiMessage=String(payload?.error||payload?.hugo_mensaje||payload?.message||'')
   assert.ok(apiMessage.length>0,'API fault must communicate cause')
   assert.match(apiMessage,/autentic|sesión|session/i)
   results.fault_injection.api_auth_error={status:'PASS',status_code:api.status(),message:apiMessage}
  } finally {await context.close()}
 }

 // 3) CROSS PERFORMANCE: critical role loads + one critical navigation each, no hanging action.
 {
  const client=await openRole('client')
  try{
   assert.ok(client.loadMs<=8000,'client load')
   await visible(client.page.getByRole('button',{name:/Abrir menú/i}).first())
   await timed('client_request_navigation_ms',async()=>{
     await client.page.getByRole('button',{name:/Abrir menú/i}).first().click()
     const drawer=client.page.getByRole('complementary',{name:'Menú UGO Cliente'})
     await visible(drawer)
     await drawer.getByRole('button',{name:/Pedir servicio/i}).click()
     await visible(client.page.locator('.ugo-client-root'))
   })
  }finally{await client.context.close()}
  const provider=await openRole('provider')
  try{
   results.performance.provider_initial_load_ms=provider.loadMs;assert.ok(provider.loadMs<=8000,'provider load')
   const nav=provider.page.getByRole('navigation',{name:'Navegación principal'}).first()
   await visible(nav)
   await timed('provider_jobs_navigation_ms',async()=>{
     await nav.getByRole('button',{name:/Trabajos/i}).first().click()
     await visible(provider.page.locator('.ugo-provider-root'))
   })
  }finally{await provider.context.close()}
  const admin=await openRole('admin')
  try{
   results.performance.admin_initial_load_ms=admin.loadMs;assert.ok(admin.loadMs<=8000,'admin load')
   const nav=admin.page.getByRole('navigation',{name:'Navegación Admin'})
   await visible(nav)
   await timed('admin_operations_navigation_ms',async()=>{
     await nav.getByRole('button',{name:/Operaciones/i}).click()
     await visible(admin.page.getByRole('group',{name:'Menú de operaciones'}))
   })
  }finally{await admin.context.close()}
  const samples=Object.values(results.performance).filter(Number.isFinite).sort((a,b)=>a-b)
  results.performance.max_ms=Math.max(...samples)
  results.performance.p95_ms=samples[Math.max(0,Math.ceil(samples.length*.95)-1)]
  results.performance.status='PASS'
 }

 results.completed_at=new Date().toISOString()
 await fs.writeFile('artifacts/readiness-safe-batch-runtime.json',JSON.stringify(results,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,results}))
} catch(error) {
 results.status='FAIL'
 results.failure=error instanceof Error?error.message:String(error)
 results.completed_at=new Date().toISOString()
 await fs.writeFile('artifacts/readiness-safe-batch-runtime.json',JSON.stringify(results,null,2)+'\n')
 throw error
} finally {
 await browser.close()
 await Promise.allSettled(Object.values(sessions).map(x=>x.sb.auth.signOut()))
}
