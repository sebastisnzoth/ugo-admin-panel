import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'

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
let browser=null

const describe=(error)=>{
  if(!error)return null
  return {message:error.message,code:error.code||null,details:error.details||null,hint:error.hint||null,status:error.status||null}
}
const stage=(name,payload={})=>{
  const record={stage:name,at:new Date().toISOString(),...payload}
  stages.push(record)
  console.log('P0_E2E_STAGE '+JSON.stringify(record))
}
const must=(result,label)=>{
  if(result?.error)throw Object.assign(new Error(label+': '+result.error.message),{cause:result.error,p0:{label,error:describe(result.error)}})
  return result
}
const anonClient=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const asUser=session=>createClient(url,anon,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{headers:{Authorization:`Bearer ${session.access_token}`}},
})

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

async function providerUiJourney({email,providerUserId}){
  const {chromium}=await import('playwright')
  await fs.mkdir('artifacts',{recursive:true})
  browser=await chromium.launch({headless:true})
  const context=await browser.newContext({
    viewport:{width:412,height:915},
    permissions:['geolocation'],
    geolocation:{latitude:PROVIDER_LAT,longitude:PROVIDER_LNG,accuracy:12},
    locale:'es-BR',
  })
  const page=await context.newPage()
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')pageErrors.push(message.text())})
  await page.addInitScript(userId=>{
    try{
      localStorage.setItem('ugo.locale.guest.provider','es')
      localStorage.setItem(`ugo.locale.provider.${userId}`,'es')
    }catch{/* almacenamiento opcional */}
  },providerUserId)
  const screenshot=name=>page.screenshot({path:`artifacts/p0-${name}.png`,fullPage:true}).catch(()=>{})
  try{
    await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
    await page.locator('[data-testid="auth-form"]').waitFor({state:'visible',timeout:45000})
    await page.locator('[data-testid="auth-email"]').fill(email)
    await page.locator('[data-testid="auth-password"]').fill(password)
    await screenshot('01-login')
    await page.locator('[data-testid="auth-form"] button.mvp-primary').click()
    await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
    stage('ui_login',{url:page.url(),authenticated:true})

    const onlineToggle=page.locator('.provider-client-online')
    if((await onlineToggle.getAttribute('aria-pressed'))!=='true'){
      await onlineToggle.click()
      await page.waitForFunction(()=>document.querySelector('.provider-client-online')?.getAttribute('aria-pressed')==='true',null,{timeout:30000})
    }
    stage('ui_online',{pressed:await onlineToggle.getAttribute('aria-pressed')})

    // A transient GPS/realtime/profile hiccup must never send a valid provider back to auth.
    await page.reload({waitUntil:'domcontentloaded'})
    await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
    assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_RELOAD')
    const storedSession=await page.evaluate(()=>{
      try{
        const raw=localStorage.getItem('ugo-test-provider-auth')
        if(!raw)return false
        const parsed=JSON.parse(raw)
        return Boolean(parsed?.access_token||parsed?.currentSession?.access_token)
      }catch{return false}
    })
    assert.ok(storedSession,'P0_PROVIDER_SESSION_NOT_PERSISTED')
    stage('ui_reload_session',{authenticated:true,persisted:true})
    return {page,screenshot,pageErrors,onlinePressed:await onlineToggle.getAttribute('aria-pressed')}
  }catch(error){
    await screenshot('ui-failure')
    await fs.writeFile('artifacts/p0-ui-failure.json',JSON.stringify({url:page.url(),pageErrors,stages},null,2)+'\n').catch(()=>{})
    throw error
  }
}

async function acceptOfferInUi(ui,{offerId:expectedOfferId}){
  const {page,screenshot,pageErrors}=ui
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:60000})
  await page.locator('[data-testid="provider-mobile-orders"]').click()
  await page.getByText(SERVICE_DESCRIPTION).first().waitFor({state:'visible',timeout:30000})
  await screenshot('02-offer-visible')
  stage('ui_offer_visible',{offerId:expectedOfferId})
  const card=page.locator('.provider-opportunity-simple').filter({hasText:SERVICE_DESCRIPTION}).first()
  await card.locator('button.provider-primary').click()
  await page.locator('.provider-main-action').waitFor({state:'visible',timeout:30000})
  await page.locator('.provider-main-action').click()
  await page.waitForFunction(()=>{
    const text=document.body.textContent||''
    return /TRABAJO ACTIVO|Continuar trabajo|Trabajo activo|Servicio asignado/i.test(text)
  },null,{timeout:45000}).catch(()=>{})
  await screenshot('03-accepted')
  assert.equal(await page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_ACCEPT')
  stage('ui_accept_clicked',{pageErrors})
  return pageErrors
}

try{
  // 0 · catalog prerequisites ---------------------------------------------
  const categories=must(await admin.from('categorias').select('id,nombre,emoji').eq('activa',true).order('nombre').limit(20),'read categories').data||[]
  if(!categories.length)throw new Error('P0_NO_ACTIVE_CATEGORY')
  categoryId=categories[0].id
  stage('catalog',{categories:categories.map(c=>c.nombre),categoryId})

  // 1 · isolated TEST identities -----------------------------------------
  const createdClient=must(await admin.auth.admin.createUser({email:clientEmail,password,email_confirm:true,user_metadata:{nombre:'UGO P0 Client',tipo:'cliente'}}),'create client auth user')
  clientId=createdClient.data.user.id
  const createdProvider=must(await admin.auth.admin.createUser({email:providerEmail,password,email_confirm:true,user_metadata:{nombre:'UGO P0 Provider',tipo:'proveedor'}}),'create provider auth user')
  providerId=createdProvider.data.user.id
  must(await admin.from('usuarios').upsert({id:clientId,email:clientEmail,nombre:'UGO P0 Client',apellido:'E2E',tipo:'cliente',activo:true,es_demo:true,pais:'BR',zona:'UGO TEST E2E'}),'insert client profile')
  must(await admin.from('usuarios').upsert({id:providerId,email:providerEmail,nombre:'UGO P0 Provider',apellido:'E2E',tipo:'proveedor',activo:true,es_demo:true,pais:'BR',zona:'UGO TEST E2E'}),'insert provider profile')
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
  const client=asUser(clientSignIn.data.session)
  const provider=asUser(providerSignIn.data.session)
  stage('sessions',{clientExpiresAt:clientSignIn.data.session.expires_at,providerExpiresAt:providerSignIn.data.session.expires_at})

  // 3 · provider goes Online in the real app (browser GPS + session proof)
  let ui=null
  if(UI){
    ui=await providerUiJourney({email:providerEmail,providerUserId:providerId})
    stage('ui_online_persisted',{online:ui.onlinePressed})
  }

  const profileAfter=must(await admin.from('perfiles_proveedor').select('online,disponible,ubicacion_updated_at,ubicacion_accuracy_m,categoria_principal_id').eq('usuario_id',providerId).single(),'read provider eligibility')
  const gpsAgeMs=Date.now()-Date.parse(String(profileAfter.data.ubicacion_updated_at||''))
  assert.equal(profileAfter.data.online,true,'P0_PROVIDER_NOT_ONLINE')
  assert.equal(profileAfter.data.disponible,true,'P0_PROVIDER_NOT_AVAILABLE')
  assert.ok(Number.isFinite(gpsAgeMs)&&gpsAgeMs>=0&&gpsAgeMs<=90_000,'P0_PROVIDER_GPS_NOT_FRESH')
  stage('provider_eligibility',{...profileAfter.data,gps_age_ms:gpsAgeMs})

  // 4 · client creates the request and persists the pickup ---------------
  const insertedService=must(await client.from('servicios').insert({
    cliente_id:clientId,categoria_id:categoryId,estado:'buscando',descripcion:SERVICE_DESCRIPTION,
    direccion_cliente:'Rua P0 E2E TEST, Florianópolis',zona:'TEST',tarifa:120,urgencia:false,
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

  const serviceAfterMatch=must(await admin.from('servicios').select('id,estado,proveedor_id,matching_expires_at').eq('id',serviceId).single(),'read service after matching')
  const offers=must(await admin.from('ofertas_servicio').select('id,servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at').eq('servicio_id',serviceId),'read persisted offers').data||[]
  stage('matching_persisted',{service:serviceAfterMatch.data,offers})
  const myOffer=offers.find(o=>o.proveedor_id===providerId&&o.estado==='pendiente')
  assert.ok(myOffer,'P0_NO_OFFER_FOR_ELIGIBLE_PROVIDER')
  offerId=myOffer.id
  assert.equal(serviceAfterMatch.data.estado,'ofrecido','P0_SERVICE_NOT_OFFERED')

  // 6 · the authenticated provider reads the offer through the app RPC ---
  const providerFeed=must(await provider.rpc('obtener_ofertas_proveedor'),'provider offer feed')
  const visible=(providerFeed.data||[]).find(o=>o.id===offerId)
  stage('provider_feed',{rows:(providerFeed.data||[]).length,visible:Boolean(visible),offerIds:(providerFeed.data||[]).map(o=>o.id)})
  assert.ok(visible,'P0_OFFER_NOT_VISIBLE_TO_PROVIDER')

  // 7 · acceptance through the real provider UI (or RPC fallback) --------
  if(ui){
    const pageErrors=await acceptOfferInUi(ui,{offerId})
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

  // 8 · both sessions survive the whole journey -------------------------
  const clientStill=must(await client.auth.getUser(),'client session still valid')
  const providerStill=must(await provider.auth.getUser(),'provider session still valid')
  assert.equal(clientStill.data.user.id,clientId,'P0_CLIENT_SESSION_LOST')
  assert.equal(providerStill.data.user.id,providerId,'P0_PROVIDER_SESSION_LOST')
  if(ui){
    assert.equal(await ui.page.locator('[data-testid="auth-form"]').count(),0,'P0_PROVIDER_SENT_BACK_TO_AUTH_AT_END')
  }
  stage('sessions_alive',{client:clientStill.data.user.id,provider:providerStill.data.user.id})

  const evidence={
    readiness_id:'p0-client-provider-e2e',sha,environment:'UGO TEST',project_ref:TEST_REF,production_touched:false,
    client_id:clientId,provider_id:providerId,category_id:categoryId,service_id:serviceId,offer_id:offerId,
    service_state:'asignado',offer_state:'aceptada',gps_age_ms:gpsAgeMs,sessions_alive:true,ui_proof:UI,
    stages,result:'PASS',completed_at:new Date().toISOString(),
  }
  await fs.mkdir('artifacts',{recursive:true})
  await fs.writeFile('artifacts/p0-client-provider-e2e.json',JSON.stringify(evidence,null,2)+'\n')
  console.log('P0_E2E_EVIDENCE '+JSON.stringify(evidence))
  console.log(`::notice title=P0 Client→Provider E2E PASS::${JSON.stringify({service_id:serviceId,offer_id:offerId,gps_age_ms:gpsAgeMs,ui:UI,result:'PASS'})}`)
}catch(error){
  const payload={result:'FAIL',sha,stage:stages.at(-1)?.stage||'bootstrap',message:error instanceof Error?error.message:String(error),cause:error?.cause?describe(error.cause):null,details:error?.p0||null,stages}
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
