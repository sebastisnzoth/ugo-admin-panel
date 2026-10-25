import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {readWithTransientRetry} from './lib/p0-test-read-retry.mjs'
import {waitForClientProfileUi} from './lib/waitForClientProfileUi.mjs'

// UGO P0 end-to-end contract: authenticated client -> persisted request -> real matching
// -> persisted offer -> authenticated provider session sees it in the real UI -> provider
// accepts from the UI -> service assigned -> both sessions still valid.
// Only UGO Arena TEST is allowed; every row created here is isolated and removed.
const TEST_REF='tmossnqfwfwjrtzwcbmm'
const TEST_URL=`https://${TEST_REF}.supabase.co`
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||''
const UI=Boolean(base)

assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon,'UGO_TEST_SUPABASE_ANON_KEY_REQUIRED')
assert.ok(serviceKey,'UGO_TEST_SUPABASE_SERVICE_ROLE_KEY_REQUIRED')
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const token=sha.slice(0,8)+'-'+Date.now()+'-'+randomUUID().slice(0,8)
const password='UGO-P0-'+randomUUID().slice(0,12)+'-A9!'
const clientEmail=`ugo-p0-client-${token}@example.test`
const providerEmail=`ugo-p0-provider-${token}@example.test`
const CLIENT_LAT=-27.5949,CLIENT_LNG=-48.5482
const PROVIDER_LAT=-27.5965,PROVIDER_LNG=-48.5499
const SERVICE_DESCRIPTION='P0 E2E · servicio real de prueba UGO Arena'
const stages=[]
let clientId=null,providerId=null,serviceId=null,offerId=null,categoryId=null
let browser=null,ui=null

const describe=(error)=>{
  if(!error)return null
  return {message:error.message,code:error.code||null,details:error.details||null,hint:error.hint||null,status:error.status||null}
}
const stage=(name,payload={})=>{
  const record={stage:name,at:new Date().toISOString(),...payload}
  stages.push(record)
  console.log('P0_E2E_STAGE '+JSON.stringify(record))
  try{
    const message=JSON.stringify(record).slice(0,9000).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')
    console.log(`::notice title=P0 stage ${name}::${message}`)
  }catch{/* anotación opcional */}
}
const must=(result,label)=>{
  if(result?.error)throw Object.assign(new Error(label+': '+result.error.message),{cause:result.error,p0:{label,error:describe(result.error)}})
  return result
}
const anonClient=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
// Reuse the real signed-in session so every request carries the user JWT (RLS applies)
// and the session can be revalidated at the end of the journey.
const sessionClient=async session=>{
  const client=anonClient()
  const{error}=await client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token})
  if(error)throw error
  return client
}

async function cleanup(){
  const failures=[]
  try{
    if(serviceId){
      for(const table of ['pagos','deudas_ugo_proveedor','ofertas_servicio']){
        const {error}=await admin.from(table).delete().eq('servicio_id',serviceId)
        if(error&&!String(error.message||'').includes('does not exist'))failures.push(`${table}: ${error.message}`)
      }
      const {error:notesError}=await admin.from('notificaciones').delete().filter('datos->>servicio_id','eq',serviceId)
      if(notesError&&!String(notesError.message||'').includes('does not exist'))failures.push(`notificaciones: ${notesError.message}`)
      const {error}=await admin.from('servicios').delete().eq('id',serviceId)
      if(error)failures.push(`servicios: ${error.message}`)
    }
    for(const id of [providerId,clientId]){
      if(!id)continue
      const profileTable=id===providerId?'perfiles_proveedor':'perfiles_cliente'
      for(const table of ['notificaciones',profileTable]){
        const {error}=await admin.from(table).delete().eq('usuario_id',id)
        if(error&&!String(error.message||'').includes('does not exist'))failures.push(`${table}: ${error.message}`)
      }
      const {error:debtError}=await admin.from('deudas_ugo_proveedor').delete().eq('proveedor_id',id)
      if(debtError&&!String(debtError.message||'').includes('does not exist'))failures.push(`deudas_ugo_proveedor: ${debtError.message}`)
      const {error:userError}=await admin.from('usuarios').delete().eq('id',id)
      if(userError)failures.push(`usuarios: ${userError.message}`)
      const {error:authError}=await admin.auth.admin.deleteUser(id)
      if(authError)failures.push(`auth: ${authError.message}`)
    }
  }catch(error){failures.push(error instanceof Error?error.message:String(error))}
  if(browser)await browser.close().catch(()=>{})
  return failures
}

async function providerUiLogin({email,providerUserId}){
  const {chromium}=await import('playwright')
  await fs.mkdir('artifacts',{recursive:true})
  if(!browser)browser=await chromium.launch({headless:true})
  const context=await browser.newContext({
    viewport:{width:412,height:915},
    permissions:['geolocation'],
    geolocation:{latitude:PROVIDER_LAT,longitude:PROVIDER_LNG,accuracy:12},
    locale:'es-BR',
  })
  const page=await context.newPage()
  const pageErrors=[]
  const failedRequests=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')pageErrors.push(message.text())})
  // Capture status and pathname only; never include auth tokens or URL query strings.
  page.on('response',response=>{
    if(response.status()!==404)return
    const request=response.request()
    let pathname='[invalid-url]'
    try{const u=new URL(response.url());pathname=u.origin+u.pathname}catch{/* avoid leaking URL */}
    const evidence={status:404,method:request.method(),url:pathname,resourceType:request.resourceType()}
    pageErrors.push('HTTP_404 '+JSON.stringify(evidence))
    stage('ui_provider_http_404',evidence)
  })
  page.on('requestfailed',request=>{
    if(request.url().includes(TEST_REF))failedRequests.push({url:request.url().split('?')[0],reason:request.failure()?.errorText||'unknown'})
  })
  await page.addInitScript(userId=>{
    try{
      localStorage.setItem('ugo.locale.guest.provider','es')
      localStorage.setItem(`ugo.locale.provider.${userId}`,'es')
    }catch{/* almacenamiento opcional */}
  },providerUserId)
  const screenshot=name=>page.screenshot({path:`artifacts/p0-${name}.png`,fullPage:true}).catch(()=>{})
  await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
  await page.locator('[data-testid="auth-form"]').waitFor({state:'visible',timeout:45000})
  await page.locator('[data-testid="auth-email"]').fill(email)
  await page.locator('[data-testid="auth-password"]').fill(password)
  await screenshot('01-login')
  await page.locator('[data-testid="auth-form"] button.mvp-primary').click()
  await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
  const stored=await page.evaluate(()=>{
    try{const raw=localStorage.getItem('ugo-test-provider-auth');if(!raw)return false;const parsed=JSON.parse(raw);return Boolean(parsed?.access_token||parsed?.currentSession?.access_token)}catch{return false}
  })
  assert.ok(stored,'P0_PROVIDER_SESSION_NOT_PERSISTED')
  // Reload: a valid session must survive a page reload without returning to auth.
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
  assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_RELOAD')
  stage('ui_login_reload',{authenticated:true,sessionPersisted:true,pageErrors})
  return {page,context,screenshot,pageErrors,failedRequests}
}

async function clientUiLogin({email,clientUserId}){
  const {chromium}=await import('playwright')
  await fs.mkdir('artifacts',{recursive:true})
  if(!browser)browser=await chromium.launch({headless:true})
  const context=await browser.newContext({viewport:{width:412,height:915},locale:'es-BR',permissions:['geolocation'],geolocation:{latitude:CLIENT_LAT,longitude:CLIENT_LNG,accuracy:12}})
  const page=await context.newPage()
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')pageErrors.push(message.text())})
  await page.addInitScript(userId=>{
    try{
      localStorage.setItem('ugo.locale.guest.client','es')
      localStorage.setItem(`ugo.locale.client.${userId}`,'es')
    }catch{/* almacenamiento opcional */}
  },clientUserId)
  await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
  await page.locator('[data-testid="auth-form"]').waitFor({state:'visible',timeout:45000})
  await page.locator('[data-testid="auth-email"]').fill(email)
  await page.locator('[data-testid="auth-password"]').fill(password)
  await page.locator('[data-testid="auth-form"] button.mvp-primary').click()
  await waitForClientProfileUi(page,page.locator('.ugo-client-root'),{
    initialTimeout:30000,recoveryTimeout:30000,
    onRecovered:()=>stage('ui_client_profile_recovered',{phase:'login',sessionPreserved:true}),
  })
  assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_CLIENT_SENT_BACK_TO_AUTH')
  const stored=await page.evaluate(()=>{
    try{const raw=localStorage.getItem('ugo-test-client-auth');if(!raw)return false;const parsed=JSON.parse(raw);return Boolean(parsed?.access_token||parsed?.currentSession?.access_token)}catch{return false}
  })
  assert.ok(stored,'P0_CLIENT_SESSION_NOT_PERSISTED')
  await page.reload({waitUntil:'domcontentloaded'})
  await waitForClientProfileUi(page,page.locator('.ugo-client-root'),{
    initialTimeout:30000,recoveryTimeout:30000,
    onRecovered:()=>stage('ui_client_profile_recovered',{phase:'reload',sessionPreserved:true}),
  })
  assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_CLIENT_SENT_BACK_TO_AUTH_AFTER_RELOAD')
  await page.screenshot({path:'artifacts/p0-00-client-login.png',fullPage:true}).catch(()=>{})
  stage('ui_client_login_reload',{authenticated:true,sessionPersisted:true,pageErrors})
  return {page,context,pageErrors}
}

async function submitClientRequestUi(page,category,clientUserId){
  await page.locator('.ugo-home-hugo-cta').click()
  const description=page.locator('#ugo-need-description')
  await description.waitFor({state:'visible',timeout:30000})
  await description.fill(category.nombre+' '+SERVICE_DESCRIPTION)
  const next=page.locator('.ugo-need-screen footer button').filter({hasText:'Continuar'}).first()
  await next.waitFor({state:'visible',timeout:30000})
  // The catalog is fetched asynchronously after login. Wait for real category
  // resolution instead of failing before the UI has received the catalog.
  await page.waitForFunction(()=>{const button=document.querySelector('.ugo-need-screen footer button');return button instanceof HTMLButtonElement&&!button.disabled},null,{timeout:30000})
  assert.ok(await next.isEnabled(),'P0_CLIENT_UI_CATEGORY_NOT_DETECTED')
  await next.click()
  await page.locator('.ugo-location-screen').waitFor({state:'visible',timeout:30000})
  // Filling the address clears the stored pickup; do it before acquiring the
  // browser GPS fix, otherwise the test inadvertently discards valid coords.
  await page.locator('.ugo-location-screen input[autocomplete="street-address"]').fill('Av. Beira-Mar Norte, 1000, Florianópolis')
  await page.locator('.ugo-location-map button').click()
  await page.waitForFunction(()=>Boolean(document.querySelector('.ugo-location-map.has-location'))&&Boolean(document.querySelector('.ugo-location-screen footer button:not(:disabled)')),null,{timeout:30000})
  await page.locator('.ugo-location-screen footer button').click()
  await page.locator('.ugo-when-screen').waitFor({state:'visible',timeout:45000})
  await page.locator('.ugo-when-screen footer button').click()
  await page.locator('.ugo-payment-screen footer button').click()
  const submit=page.locator('.ugo-summary-screen footer button')
  await submit.waitFor({state:'visible',timeout:30000})
  // ClientSummaryScreen reads the stored draft after its own role session hydrates.
  // A visible summary can briefly show placeholders while Auth is loading; never
  // submit until the real category, description and address are rendered.
  const expectedDescription=category.nombre+' '+SERVICE_DESCRIPTION
  // The GPS action intentionally resolves the device location to a new address.
  // Compare the summary to the persisted client draft, not to the earlier manual input.
  const draft=await page.evaluate(uid=>{try{return JSON.parse(sessionStorage.getItem('ugo:guided-request-draft:'+uid)||'{}')}catch{return null}},clientUserId)
  const expectedAddress=String(draft?.address||'').trim()
  assert.equal(draft?.categoryId,category.id,'P0_CLIENT_UI_SUMMARY_CATEGORY_NOT_PERSISTED')
  assert.equal(draft?.description,expectedDescription,'P0_CLIENT_UI_SUMMARY_DESCRIPTION_NOT_PERSISTED')
  assert.ok(expectedAddress.length>=5,'P0_CLIENT_UI_SUMMARY_ADDRESS_NOT_PERSISTED')
  assert.ok(Number.isFinite(draft?.pickupLat)&&Number.isFinite(draft?.pickupLng),'P0_CLIENT_UI_PICKUP_NOT_PERSISTED')
  await page.waitForFunction(({description,address})=>{
    const summary=document.querySelector('.ugo-summary-screen')
    const button=summary?.querySelector('footer button')
    const text=summary?.textContent||''
    return button instanceof HTMLButtonElement&&!button.disabled
      &&text.includes(description)&&text.includes(address)
  },{description:expectedDescription,address:expectedAddress},{timeout:30000})
  assert.ok(await submit.isEnabled(),'P0_CLIENT_UI_SUMMARY_NOT_READY')
  const summaryText=await page.locator('.ugo-summary-screen').innerText()
  assert.ok(summaryText.includes(expectedDescription),'P0_CLIENT_UI_SUMMARY_DESCRIPTION_MISMATCH')
  assert.ok(summaryText.includes(expectedAddress),'P0_CLIENT_UI_SUMMARY_ADDRESS_MISMATCH')
  await submit.click()
  await page.locator('.ugo-matching-screen').waitFor({state:'visible',timeout:45000})
}

async function attemptUiOnline(ui){
  const {page,screenshot}=ui
  const toggle=page.locator('.provider-client-online')
  const before=await toggle.getAttribute('aria-pressed')
  if(before!=='true'){
    await toggle.click()
    await page.waitForFunction(()=>document.querySelector('.provider-client-online')?.getAttribute('aria-pressed')==='true',null,{timeout:20000}).catch(()=>{})
  }
  const pressed=await toggle.getAttribute('aria-pressed')
  const notices=await page.locator('.provider-notice').allInnerTexts().catch(()=>[])
  const body=(await page.locator('body').innerText().catch(()=>'')).slice(0,2500)
  await screenshot('02-online')
  return {pressed,notices,body,buttons:await page.locator('button').allInnerTexts().catch(()=>[])}
}

async function proveAutomaticGpsHeartbeat(ui,initialProfile){
  // Chromium's static geolocation fixture does not guarantee a new sensor fix.
  // First observe natural refresh; then simulate a *new device fix* and require
  // the app to publish it without clicking Refresh or using the service-role RPC.
  const initialAt=Date.parse(String(initialProfile?.ubicacion_updated_at||''))
  assert.ok(Number.isFinite(initialAt),'P0_UI_GPS_INITIAL_TIMESTAMP_REQUIRED')
  const started=Date.now(),deadline=started+55_000
  let last=null,injected=false
  while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,5_000))
    const result=must(await admin.from('perfiles_proveedor').select('online,disponible,ubicacion_updated_at,ubicacion_accuracy_m').eq('usuario_id',providerId).single(),'read browser GPS heartbeat')
    last=result.data
    const capturedAt=Date.parse(String(last.ubicacion_updated_at||''))
    if(last.online===true&&last.disponible===true&&Number.isFinite(capturedAt)&&capturedAt>initialAt&&Date.now()-capturedAt<=90_000&&Number(last.ubicacion_accuracy_m)>0&&Number(last.ubicacion_accuracy_m)<=250){
      assert.equal(await ui.page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_LOGGED_OUT_DURING_GPS_HEARTBEAT')
      const notices=await ui.page.locator('.provider-notice').allInnerTexts().catch(()=>[])
      assert.ok(!notices.some(text=>/no pudimos obtener tu ubicaci[oó]n|location unavailable|n[aã]o conseguimos obter sua localiza[cç][aã]o/i.test(text)),'P0_PROVIDER_STALE_GPS_GLOBAL_NOTICE')
      stage('ui_gps_device_fix_autopublish',{initialAt:new Date(initialAt).toISOString(),renewedAt:last.ubicacion_updated_at,accuracy_m:last.ubicacion_accuracy_m,source:injected?'simulated_new_device_fix':'natural_browser_refresh',sessionPreserved:true})
      return
    }
    if(!injected&&Date.now()-started>=15_000){
      injected=true
      await ui.context.setGeolocation({latitude:PROVIDER_LAT+0.00008,longitude:PROVIDER_LNG,accuracy:12})
      stage('ui_gps_device_fix_simulated',{note:'Chromium sensor fixture explicitly emits a new GPS fix; not physical Mac evidence'})
    }
  }
  stage('ui_gps_device_fix_autopublish_failed',{initialProfile,last,injected})
  assert.fail('P0_UI_GPS_NEW_DEVICE_FIX_NOT_PUBLISHED')
}

async function proveProviderRealtimeRecovery(ui){
 const {page,context}=ui
 const latestReady=()=>page.evaluate(()=>{
  try{
   const trace=JSON.parse(localStorage.getItem('ugo:provider:auth-trace:v1')||'[]')
   if(!Array.isArray(trace))return 0
   return trace.filter(item=>item?.origin==='realtime'&&item?.reason==='channel_ready').at(-1)?.at||0
  }catch{return 0}
 })
 await page.waitForFunction(()=>{
  try{
   const trace=JSON.parse(localStorage.getItem('ugo:provider:auth-trace:v1')||'[]')
   return Array.isArray(trace)&&trace.some(item=>item?.origin==='realtime'&&item?.reason==='channel_ready')
  }catch{return false}
 },null,{timeout:30000})
 const before=await latestReady()
 assert.ok(before>0,'P0_PROVIDER_REALTIME_INITIAL_READY_REQUIRED')
 await context.setOffline(true)
 await page.waitForFunction(()=>navigator.onLine===false,null,{timeout:10000})
 assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_OFFLINE')
 await context.setOffline(false)
 await page.waitForFunction(previous=>{
  try{
   const trace=JSON.parse(localStorage.getItem('ugo:provider:auth-trace:v1')||'[]')
   return Array.isArray(trace)&&trace.some(item=>item?.origin==='realtime'&&item?.reason==='channel_ready'&&item.at>previous)
  }catch{return false}
 },before,{timeout:30000})
 const after=await latestReady()
 assert.ok(after>before,'P0_PROVIDER_REALTIME_NOT_RECOVERED')
 await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:10000})
 assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_RECONNECT')
 stage('ui_realtime_offline_online',{reconnected:true,readyBefore:before,readyAfter:after,sessionPreserved:true})
 return {reconnected:true,readyBefore:before,readyAfter:after}
}

async function armProviderLiveOfferProbe(page){
 // Observe the live popup before a new request exists. Its five-second UI
 // lifetime is too short to rely on checking only after the matching RPC.
 await page.locator('.ugo-notification-trigger').waitFor({state:'visible',timeout:20000})
 await page.evaluate(()=>{
  window.__ugoP0LiveOfferSignals=[]
  const capture=()=>{
   const node=document.querySelector('.ugo-notification-live.is-provider-call')
   if(!node)return
   const offerId=node.getAttribute('data-ugo-offer-id')
   const serviceId=node.getAttribute('data-ugo-service-id')
   if(!offerId||!serviceId)return
   const signals=window.__ugoP0LiveOfferSignals
   if(!signals.some(signal=>signal.offerId===offerId&&signal.serviceId===serviceId)){
    signals.push({offerId,serviceId,observedAt:new Date().toISOString()})
   }
  }
  new MutationObserver(capture).observe(document.body,{subtree:true,childList:true,attributes:true})
  capture()
 })
}

async function assertProviderLiveOffer(ui,offerId,serviceId){
 await ui.page.waitForFunction(({offerId,serviceId})=>{
  const signals=window.__ugoP0LiveOfferSignals
  return Array.isArray(signals)&&signals.some(signal=>signal.offerId===offerId&&signal.serviceId===serviceId)
 },{offerId,serviceId},{timeout:60000})
 const signals=await ui.page.evaluate(()=>window.__ugoP0LiveOfferSignals)
 const signal=signals.find(signal=>signal.offerId===offerId&&signal.serviceId===serviceId)
 assert.ok(signal,'P0_PROVIDER_LIVE_OFFER_NOT_DELIVERED')
 stage('ui_provider_live_offer_without_reload',{offerId,serviceId,observedAt:signal.observedAt})
}

async function acceptOfferInUi(ui){
  const {page,screenshot,pageErrors}=ui
  // No reload here: the provider must see the offer on the same live page.
  await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
  assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_BEFORE_OFFER')
  await page.locator('[data-testid="provider-mobile-orders"]').click()
  await page.getByText(SERVICE_DESCRIPTION).first().waitFor({state:'visible',timeout:45000})
  await screenshot('03-offer-visible')
  stage('ui_offer_visible',{offerId})
  const card=page.locator('.provider-opportunity-simple').filter({hasText:SERVICE_DESCRIPTION}).first()
  await card.locator('button.provider-primary').click()
  await page.locator('.provider-main-action').waitFor({state:'visible',timeout:45000})
  await screenshot('04-offer-detail')
  await page.locator('.provider-main-action').click()
  // The provider app must land on the assigned job screen and keep the session.
  await page.locator('.provider-view-active-job').waitFor({state:'visible',timeout:60000})
  await page.waitForFunction(()=>/TRABAJO ACTIVO|Continuar trabajo|Trabajo activo/i.test(document.body.textContent||''),null,{timeout:30000}).catch(()=>{})
  await screenshot('05-accepted')
  assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_ACCEPT')
  stage('ui_accepted',{url:page.url(),pageErrors})
  return pageErrors
}

try{
  // 0 · catalog prerequisites ---------------------------------------------
  const categories=(await readWithTransientRetry(async()=>must(await admin.from('categorias').select('id,nombre,emoji').eq('activa',true).order('nombre').limit(20),'read categories').data,{onRetry:retry=>stage('catalog_read_retry',retry)}))||[]
  if(!categories.length)throw new Error('P0_NO_ACTIVE_CATEGORY')
  categoryId=(categories.find(c=>/limpeza|limpieza|faxina|repar|electric/i.test(c.nombre))||categories[0]).id
  stage('catalog',{categories:categories.map(c=>c.nombre),categoryId})

  // 1 · isolated TEST identities -----------------------------------------
  const createdClient=must(await admin.auth.admin.createUser({email:clientEmail,password,email_confirm:true,user_metadata:{nombre:'UGO P0 Client',tipo:'cliente'}}),'create client auth user')
  clientId=createdClient.data.user.id
  const createdProvider=must(await admin.auth.admin.createUser({email:providerEmail,password,email_confirm:true,user_metadata:{nombre:'UGO P0 Provider',tipo:'proveedor'}}),'create provider auth user')
  providerId=createdProvider.data.user.id
  must(await admin.from('usuarios').upsert({id:clientId,email:clientEmail,nombre:'UGO P0 Client',apellido:'E2E',tipo:'cliente',activo:true,es_demo:false,pais:'BR',zona:'UGO TEST E2E'}),'insert client profile')
  must(await admin.from('usuarios').upsert({id:providerId,email:providerEmail,nombre:'UGO P0 Provider',apellido:'E2E',tipo:'proveedor',activo:true,es_demo:false,pais:'BR',zona:'UGO TEST E2E'}),'insert provider profile')
  must(await admin.from('perfiles_cliente').upsert({usuario_id:clientId,ciudad:'Florianópolis',telefono:'48999999999',direccion:'Rua P0 E2E TEST',barrio:'TEST',termos_aceitos_at:new Date().toISOString(),termos_versao:'2026-09-04',idioma_preferido:'es',onboarding_completo_at:new Date().toISOString()}),'insert client profile row')
  const nowIso=new Date().toISOString()
  must(await admin.from('perfiles_proveedor').upsert({
    usuario_id:providerId,estado_verificacion:'verificado',ciudad_base:'Florianópolis',
    categoria_principal_id:categoryId,tarifa_base:150,zona_radio_km:20,online:false,disponible:false,
    onboarding_completo_at:nowIso,termos_aceitos_at:nowIso,termos_versao:'2026-09-04',
    disponibilidad_horaria:null,bio:'UGO P0 E2E provider',
  }),'insert provider profile row')
  stage('identities',{clientId,providerId,clientEmail,providerEmail})

  // 2 · real authenticated sessions --------------------------------------
  const clientAuth=anonClient()
  const clientSignIn=must(await clientAuth.auth.signInWithPassword({email:clientEmail,password}),'client sign-in')
  assert.ok(clientSignIn.data.session,'P0_CLIENT_SESSION_REQUIRED')
  const providerAuth=anonClient()
  const providerSignIn=must(await providerAuth.auth.signInWithPassword({email:providerEmail,password}),'provider sign-in')
  assert.ok(providerSignIn.data.session,'P0_PROVIDER_SESSION_REQUIRED')
  const client=await sessionClient(clientSignIn.data.session)
  const provider=await sessionClient(providerSignIn.data.session)
  stage('sessions',{clientExpiresAt:clientSignIn.data.session.expires_at,providerExpiresAt:providerSignIn.data.session.expires_at})

  // 3 · provider goes Online in the real app (browser GPS + session proof)
  let clientUi=null
  if(UI){
    clientUi=await clientUiLogin({email:clientEmail,clientUserId:clientId})
    ui=await providerUiLogin({email:providerEmail,providerUserId:providerId})
    const online=await attemptUiOnline(ui)
    const after=await admin.from('perfiles_proveedor').select('online,disponible,ubicacion_updated_at,ubicacion_accuracy_m').eq('usuario_id',providerId).maybeSingle()
    stage('ui_online_attempt',{...online,profile:after.data,profileError:describe(after.error),failedRequests:ui.failedRequests})
    assert.equal(online.pressed,'true','P0_UI_ONLINE_TOGGLE_FAILED')
    must(after,'read provider GPS published by UI')
    assert.equal(after.data?.online,true,'P0_UI_PROVIDER_NOT_ONLINE')
    assert.equal(after.data?.disponible,true,'P0_UI_PROVIDER_NOT_AVAILABLE')
    const browserGpsAge=Date.now()-Date.parse(String(after.data?.ubicacion_updated_at||''))
    assert.ok(Number.isFinite(browserGpsAge)&&browserGpsAge>=0&&browserGpsAge<=90_000,'P0_UI_PROVIDER_GPS_NOT_PUBLISHED')
    await proveAutomaticGpsHeartbeat(ui,after.data)
    assert.equal(online.pressed,'true','P0_PROVIDER_UI_ONLINE_FAILED')
  }

  // 3b · authoritative API activation (captures the exact backend rejection)
  if(!UI){
    const activated=await provider.rpc('activar_disponibilidad_proveedor',{
      p_lat:PROVIDER_LAT,p_lng:PROVIDER_LNG,p_captured_at:new Date().toISOString(),p_accuracy_m:12,
    })
    stage('provider_online_rpc',{data:activated.data,error:describe(activated.error)})
    must(activated,'provider online API-only')
  }
  if(ui){
    await ui.page.reload({waitUntil:'domcontentloaded'})
    await ui.page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
    assert.equal(await ui.page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_RELOAD_ONLINE')
    const onlineReflected=await ui.page.locator('.provider-client-online').getAttribute('aria-pressed')
    stage('ui_online_persisted',{onlineReflected})
    assert.equal(onlineReflected,'true','P0_PROVIDER_UI_DOES_NOT_REFLECT_ONLINE')
  }

  const profileAfter=must(await admin.from('perfiles_proveedor').select('online,disponible,ubicacion_updated_at,ubicacion_accuracy_m,categoria_principal_id').eq('usuario_id',providerId).single(),'read provider eligibility')
  const gpsAgeMs=Date.now()-Date.parse(String(profileAfter.data.ubicacion_updated_at||''))
  stage('provider_eligibility',{...profileAfter.data,gps_age_ms:gpsAgeMs})
  assert.equal(profileAfter.data.online,true,'P0_PROVIDER_NOT_ONLINE')
  assert.equal(profileAfter.data.disponible,true,'P0_PROVIDER_NOT_AVAILABLE')
  assert.ok(Number.isFinite(gpsAgeMs)&&gpsAgeMs>=0&&gpsAgeMs<=90_000,'P0_PROVIDER_GPS_NOT_FRESH')

  let realtimeRecovery=null
  if(ui){
   realtimeRecovery=await proveProviderRealtimeRecovery(ui)
   await armProviderLiveOfferProbe(ui.page)
  }

  // 4 · client creates the request and persists the pickup ---------------
  if(UI){
    const category=categories.find(c=>c.id===categoryId)
    assert.ok(category,'P0_UI_CATEGORY_MISSING')
    await submitClientRequestUi(clientUi.page,category,clientId)
    for(let attempt=0;attempt<40;attempt++){
      const observed=must(await admin.from('servicios').select('id,estado,numero,cliente_id,categoria_id,descripcion').eq('cliente_id',clientId),'observe UI service')
      const found=(observed.data||[]).find(row=>String(row.descripcion||'').includes(SERVICE_DESCRIPTION))
      if(found){serviceId=found.id;stage('service_created',{...found,origin:'CLIENT_UI'});break}
      await new Promise(resolve=>setTimeout(resolve,1000))
    }
    assert.ok(serviceId,'P0_CLIENT_UI_DID_NOT_CREATE_SERVICE')
  }else{
  const insertedService=must(await client.from('servicios').insert({
    cliente_id:clientId,categoria_id:categoryId,estado:'buscando',descripcion:SERVICE_DESCRIPTION,
    direccion_cliente:'Rua P0 E2E TEST, Florianópolis',zona:'TEST',tarifa:120,urgencia:false,ambiente:'real',
    metadata:{requested_payment_method:'pix',payment_method:'pix',payment_selected_before_order:true,estimated_duration_minutes:60,qa_p0_e2e:true,runtime_sha:sha},
  }).select('id,estado,numero,cliente_id,categoria_id').single(),'client insert service')
  serviceId=insertedService.data.id
  stage('service_created',insertedService.data)

  const pickup=await client.rpc('guardar_ubicacion_servicio_cliente',{p_servicio_id:serviceId,p_lat:CLIENT_LAT,p_lng:CLIENT_LNG})
  stage('service_pickup',{data:pickup.data,error:describe(pickup.error)})
  must(pickup,'guardar_ubicacion_servicio_cliente')

  // 5 · real authenticated matching --------------------------------------
  const matching=await client.rpc('iniciar_matching',{p_servicio_id:serviceId})
  stage('matching_rpc',{rows:Array.isArray(matching.data)?matching.data.length:null,data:matching.data,error:describe(matching.error)})
  must(matching,'iniciar_matching')
  }

  if(UI){
    let foundOffer=false
    for(let attempt=0;attempt<45;attempt++){
      const current=must(await admin.from('ofertas_servicio').select('id').eq('servicio_id',serviceId).eq('proveedor_id',providerId).limit(1),'observe UI matching')
      if(current.data?.length){foundOffer=true;break}
      await new Promise(resolve=>setTimeout(resolve,1000))
    }
    assert.ok(foundOffer,'P0_CLIENT_UI_MATCHING_DID_NOT_CREATE_OFFER')
    stage('ui_matching_persisted',{serviceId,origin:'CLIENT_UI',noManualRpc:true})
  }
  const serviceAfterMatch=must(await admin.from('servicios').select('id,estado,proveedor_id,matching_expires_at').eq('id',serviceId).single(),'read service after matching')
  const offers=must(await admin.from('ofertas_servicio').select('id,servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at').eq('servicio_id',serviceId),'read persisted offers').data||[]
  stage('matching_persisted',{service:serviceAfterMatch.data,offers})
  const providerOffers=offers.filter(o=>o.proveedor_id===providerId)
  assert.equal(providerOffers.length,1,'P0_DUPLICATE_PROVIDER_OFFERS')
  const myOffer=providerOffers.find(o=>o.estado==='pendiente')
  assert.ok(myOffer,'P0_NO_OFFER_FOR_ELIGIBLE_PROVIDER')
  offerId=myOffer.id
  assert.equal(serviceAfterMatch.data.estado,'ofrecido','P0_SERVICE_NOT_OFFERED')
  // The backend offer alone is insufficient: prove foreground delivery on
  // the same provider browser before any reload or offer acceptance.
  if(ui)await assertProviderLiveOffer(ui,offerId,serviceId)

  // 6 · the authenticated provider reads the offer through the app RPC ---
  const providerFeed=must(await provider.rpc('obtener_ofertas_proveedor'),'provider offer feed')
  const visible=(providerFeed.data||[]).find(o=>o.id===offerId)
  stage('provider_feed',{rows:(providerFeed.data||[]).length,visible:Boolean(visible),offerIds:(providerFeed.data||[]).map(o=>o.id)})
  assert.ok(visible,'P0_OFFER_NOT_VISIBLE_TO_PROVIDER')

  // 7 · acceptance through the real provider UI (or RPC fallback) --------
  if(ui){
    const pageErrors=await acceptOfferInUi(ui)
    stage('ui_accept_page_errors',{pageErrors})
  }else{
    must(await provider.rpc('aceptar_oferta',{p_oferta_id:offerId}),'aceptar_oferta')
  }

  const servicesAfter=must(await admin.from('servicios').select('id,estado,proveedor_id,tarifa,comision_ugo,ganancia_proveedor,aceptado_at').eq('id',serviceId).single(),'read service after acceptance')
  const offersAfter=must(await admin.from('ofertas_servicio').select('id,estado,respondida_at').eq('servicio_id',serviceId),'read offers after acceptance').data||[]
  stage('accept_persisted',{service:servicesAfter.data,offers:offersAfter})
  assert.equal(servicesAfter.data.estado,'asignado','P0_SERVICE_NOT_ASSIGNED')
  assert.equal(servicesAfter.data.proveedor_id,providerId,'P0_SERVICE_ASSIGNED_TO_OTHER_PROVIDER')
  assert.ok(offersAfter.some(o=>o.id===offerId&&o.estado==='aceptada'),'P0_OFFER_NOT_ACCEPTED')

  // Replaying the exact accepted offer must return the same assignment without
  // changing service economics, timestamps or offer state.
  const acceptedAgain=must(await provider.rpc('aceptar_oferta',{p_oferta_id:offerId}),'idempotent offer acceptance replay')
  assert.equal(acceptedAgain.data?.id,serviceId,'P0_ACCEPT_REPLAY_CHANGED_ASSIGNMENT')
  const serviceAfterReplay=must(await admin.from('servicios').select('id,estado,proveedor_id,tarifa,comision_ugo,ganancia_proveedor,aceptado_at').eq('id',serviceId).single(),'read service after acceptance replay')
  const offersAfterReplay=must(await admin.from('ofertas_servicio').select('id,estado,respondida_at').eq('servicio_id',serviceId),'read offers after acceptance replay').data||[]
  assert.deepEqual(serviceAfterReplay.data,servicesAfter.data,'P0_ACCEPT_REPLAY_CHANGED_SERVICE')
  assert.deepEqual(offersAfterReplay,offersAfter,'P0_ACCEPT_REPLAY_CHANGED_OFFERS')
  stage('accept_replay_idempotent',{serviceId,offerId,unchanged:true})

  // 8 · both sessions survive the whole journey -------------------------
  const clientStill=must(await client.auth.getUser(),'client session still valid')
  const providerStill=must(await provider.auth.getUser(),'provider session still valid')
  assert.equal(clientStill.data.user.id,clientId,'P0_CLIENT_SESSION_LOST')
  assert.equal(providerStill.data.user.id,providerId,'P0_PROVIDER_SESSION_LOST')
  if(ui)assert.equal(await ui.page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AT_END')
  stage('sessions_alive',{client:clientStill.data.user.id,provider:providerStill.data.user.id})

  const evidence={
    readiness_id:'p0-client-provider-e2e',sha,environment:'UGO TEST',project_ref:TEST_REF,production_touched:false,
    client_id:clientId,provider_id:providerId,category_id:categoryId,service_id:serviceId,offer_id:offerId,
    service_state:'asignado',offer_state:'aceptada',gps_age_ms:gpsAgeMs,sessions_alive:true,ui_proof:UI,client_ui_proof:Boolean(clientUi),
    realtime_recovery:realtimeRecovery,accept_replay_idempotent:true,duplicate_provider_offers:false,
    stages,result:'PASS',completed_at:new Date().toISOString(),
  }
  await fs.mkdir('artifacts',{recursive:true})
  await fs.writeFile('artifacts/p0-client-provider-e2e.json',JSON.stringify(evidence,null,2)+'\n')
  console.log('P0_E2E_EVIDENCE '+JSON.stringify(evidence))
  console.log(`::notice title=P0 Client→Provider E2E PASS::${JSON.stringify({service_id:serviceId,offer_id:offerId,gps_age_ms:gpsAgeMs,ui:UI,result:'PASS'})}`)
}catch(error){
  let pageDump=null
  try{
    const pages=[]
    for(const context of browser?.contexts()||[])for(const page of context.pages())pages.push({url:page.url(),body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1500)})
    const providerPage=ui?.page
    pageDump={providerUrl:providerPage?.url()||null,providerBody:providerPage?(await providerPage.locator('body').innerText().catch(()=>'')).slice(0,2500):null,providerErrors:ui?.pageErrors||[],pages}
    if(providerPage)await providerPage.screenshot({path:'artifacts/p0-failure-provider.png',fullPage:true}).catch(()=>{})
    if(browser?.contexts()[0]?.pages()[0])await browser.contexts()[0].pages()[0].screenshot({path:'artifacts/p0-failure.png',fullPage:true}).catch(()=>{})
  }catch{/* diagnóstico opcional */}
  const payload={result:'FAIL',sha,stage:stages.at(-1)?.stage||'bootstrap',message:error instanceof Error?error.message:String(error),cause:error?.cause?describe(error.cause):null,details:error?.p0||null,pageDump,stages}
  console.log('P0_E2E_FAILURE '+JSON.stringify(payload))
  await fs.mkdir('artifacts',{recursive:true}).catch(()=>{})
  await fs.writeFile('artifacts/p0-client-provider-e2e-failure.json',JSON.stringify(payload,null,2)+'\n').catch(()=>{})
  const encoded=JSON.stringify(payload).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')
  console.log(`::error title=P0 Client→Provider E2E FAIL::${encoded.slice(0,60000)}`)
  process.exitCode=1
}finally{
  const failures=await cleanup()
  stage('cleanup',{ok:failures.length===0,failures})
  console.log(`::notice title=P0 Client→Provider E2E cleanup::${JSON.stringify({ok:failures.length===0,failures})}`)
  if(failures.length)process.exitCode=1
}
