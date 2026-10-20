import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const email=process.env.UGO_TEST_PROVIDER_EMAIL||''
const password=process.env.UGO_TEST_PROVIDER_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(email&&password&&sha,'UGO_TEST_PROVIDER_UI_INPUTS_REQUIRED')

const LOCATION={latitude:-27.5969,longitude:-48.5482,accuracy:20}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

async function assertResponsive(page,label){
 const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,documentClient:document.documentElement.clientWidth,bodyWidth:document.body.scrollWidth,bodyClient:document.body.clientWidth}))
 assert.ok(metrics.documentWidth<=metrics.documentClient+4,label+' document overflow '+JSON.stringify(metrics))
 assert.ok(metrics.bodyWidth<=metrics.bodyClient+4,label+' body overflow '+JSON.stringify(metrics))
}

async function signInThroughUi(page){
 const form=page.getByTestId('auth-form')
 await form.waitFor({state:'visible',timeout:45_000})
 await page.getByTestId('auth-email').fill(email)
 await page.getByTestId('auth-password').fill(password)
 await form.locator('button[type="submit"]').click()
 try{
  await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:45_000})
 }catch{
  const errorVisible=await page.locator('.mvp-form-error').isVisible().catch(()=>false)
  throw new Error(errorVisible?'UGO_TEST_PROVIDER_UI_LOGIN_FAILED':'UGO_TEST_PROVIDER_ROOT_NOT_REACHED')
 }
}

async function appAuthCheck(page,{refresh=false}={}){
 const result=await page.evaluate(async shouldRefresh=>{
  const{getRoleSupabase}=await import('/src/lib/roleSupabase.ts')
  const auth=getRoleSupabase('provider').auth
  const before=await auth.getSession()
  if(before.error||!before.data.session)return{ok:false,issue:'session_missing'}
  const userId=before.data.session.user.id
  if(shouldRefresh){
   const refreshed=await auth.refreshSession()
   if(refreshed.error||!refreshed.data.session)return{ok:false,issue:'refresh_failed'}
  }
  const[sessionResult,userResult]=await Promise.all([auth.getSession(),auth.getUser()])
  const session=sessionResult.data.session,user=userResult.data.user
  return{
   ok:!sessionResult.error&&!userResult.error&&Boolean(session&&user)&&session.user.id===userId&&user.id===userId,
   issue:sessionResult.error||userResult.error?'server_verification_failed':!session||!user?'session_missing':'identity_mismatch',
   identityVerified:Boolean(session&&user&&session.user.id===userId&&user.id===userId),
  }
 },refresh)
 assert.ok(result.ok,'UGO_TEST_PROVIDER_AUTH_CHECK_FAILED_'+result.issue)
 return result
}

async function installRefreshObserver(page){
 await page.evaluate(()=>{
  window.__ugoTokenRefreshEvents=0
  window.addEventListener('ugo:session-diagnostic',event=>{
   if(event.detail?.role==='provider'&&event.detail?.reason==='token_refreshed')window.__ugoTokenRefreshEvents++
  })
 })
}

async function refreshAndVerify(page){
 const previous=await page.evaluate(()=>window.__ugoTokenRefreshEvents||0)
 const result=await appAuthCheck(page,{refresh:true})
 await page.waitForFunction(count=>window.__ugoTokenRefreshEvents>count,previous,{timeout:15_000})
 await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:15_000})
 assert.equal(await page.getByTestId('auth-form').count(),0,'valid refreshed session must not return to login')
 return result
}

async function readAvailability(page){
 const state=await page.evaluate(async()=>{
  const{getRoleSupabase}=await import('/src/lib/roleSupabase.ts')
  const client=getRoleSupabase('provider')
  const{data:auth,error:authError}=await client.auth.getSession()
  const userId=auth.session?.user.id
  if(authError||!userId)return null
  const{data,error}=await client.from('perfiles_proveedor').select('disponible,online,ubicacion_updated_at,ubicacion_accuracy_m').eq('usuario_id',userId).maybeSingle()
  if(error||!data)return null
  return data
 })
 assert.ok(state,'authenticated provider profile availability is unreadable')
 return state
}

async function setProviderOnline(page,desired){
 const button=page.locator('.provider-operational-dock .provider-operational-chip').first()
 await button.waitFor({state:'visible',timeout:15_000})
 const current=await button.getAttribute('aria-pressed')==='true'
 if(current!==desired){
  await button.click()
  await page.waitForFunction(value=>document.querySelector('.provider-operational-dock .provider-operational-chip')?.getAttribute('aria-pressed')===String(value),desired,{timeout:30_000})
 }
 const persisted=await readAvailability(page)
 assert.equal(Boolean(persisted.disponible&&persisted.online),desired,'availability must match persisted provider state')
 return persisted
}

async function assertFreshGps(state){
 const capturedAt=Date.parse(String(state.ubicacion_updated_at||''))
 const age=Date.now()-capturedAt,accuracy=Number(state.ubicacion_accuracy_m)
 assert.ok(Number.isFinite(capturedAt)&&age>=-5_000&&age<=90_000,'persisted provider GPS must be current')
 assert.ok(Number.isFinite(accuracy)&&accuracy>0&&accuracy<=250,'persisted provider GPS precision must remain acceptable')
}

async function verifyOfflineReconnect(page,context){
 await context.setOffline(true)
 const local=await page.evaluate(async()=>{
  const{getRoleSupabase}=await import('/src/lib/roleSupabase.ts')
  const{data,error}=await getRoleSupabase('provider').auth.getSession()
  return{present:Boolean(data.session),error:Boolean(error)}
 })
 assert.equal(local.present,true,'network loss must not erase the browser-persisted session')
 assert.equal(local.error,false)
 await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:5_000})
 await context.setOffline(false)
 await sleep(1_000)
 await appAuthCheck(page)
 await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:15_000})
}

async function verifyVoluntaryLogout(page){
 await page.locator('.provider-studio-nav button').filter({hasText:/Perfil|Profile/i}).click()
 const logout=page.locator('.provider-signout')
 await logout.waitFor({state:'visible',timeout:15_000})
 await logout.click()
 await page.getByTestId('auth-form').waitFor({state:'visible',timeout:30_000})
 const state=await page.evaluate(async()=>{
  const{getRoleSupabase}=await import('/src/lib/roleSupabase.ts')
  const{data,error}=await getRoleSupabase('provider').auth.getSession()
  return{present:Boolean(data.session),error:Boolean(error)}
 })
 assert.equal(state.error,false)
 assert.equal(state.present,false,'voluntary sign-out must clear the browser session')
}

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const results=[]
let context
try{
 context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['geolocation'],geolocation:LOCATION})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(String(error?.message||error)))
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
 await signInThroughUi(page)
 await assertResponsive(page,'provider desktop home')
 await installRefreshObserver(page)
 await appAuthCheck(page)
 const refreshOne=await refreshAndVerify(page)
 const refreshTwo=await refreshAndVerify(page)
 await verifyOfflineReconnect(page,context)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:30_000})
 await appAuthCheck(page)

 const initialAvailability=await readAvailability(page)
 assert.equal(Boolean(initialAvailability.disponible),Boolean(initialAvailability.online),'TEST provider must start in a consistent availability state')
 let availabilityRestored=false
 try{
  const pendingDebts=await page.evaluate(async()=>{
   const{getRoleSupabase}=await import('/src/lib/roleSupabase.ts')
   const client=getRoleSupabase('provider'),{data:auth}=await client.auth.getSession(),userId=auth.session?.user.id
   if(!userId)return null
   const{data,error}=await client.from('deudas_ugo_proveedor').select('estado,saldo_pendiente,ambiente').eq('proveedor_id',userId)
   if(error)return null
   return(data||[]).filter(item=>item.ambiente==='real'&&!['pagado','anulado'].includes(item.estado)&&Number(item.saldo_pendiente||0)>0).length
  })
  assert.ok(pendingDebts!==null,'provider debt status must be readable before availability exercise')
  assert.ok(pendingDebts<3,'existing UGO debt restrictions must not be bypassed by the runtime test')
  await setProviderOnline(page,false)
  const online=await setProviderOnline(page,true)
  await assertFreshGps(online)
  await setProviderOnline(page,false)
  results.push({journey:'online-offline',status:'PASS',freshGps:true})
 }finally{
  const originalOnline=Boolean(initialAvailability.disponible&&initialAvailability.online)
  await setProviderOnline(page,originalOnline)
  availabilityRestored=true
 }
 assert.equal(availabilityRestored,true,'original TEST provider availability must be restored')
 await assertResponsive(page,'provider desktop home after reconnect and availability cycle')
 await page.screenshot({path:'artifacts/provider-ui-desktop.png',fullPage:true})
 results.push({viewport:'desktop',status:'PASS',realUiLogin:true,tokenRefreshes:2,jwtVerifiedAfterEachRefresh:true,networkReconnect:true,reloadPersistence:true})

 await page.setViewportSize({width:820,height:1180})
 await assertResponsive(page,'provider tablet home')
 await page.screenshot({path:'artifacts/provider-ui-tablet.png',fullPage:true})
 const tabletNav=page.getByRole('navigation',{name:/Navega.*principal|Main navigation/i})
 await tabletNav.waitFor({state:'visible',timeout:10_000})
 results.push({viewport:'tablet',status:'PASS',navigation:'studio-sidebar'})

 await page.setViewportSize({width:390,height:844})
 await assertResponsive(page,'provider mobile home')
 const bottom=page.getByRole('navigation',{name:/Navegación proveedor|Navegação do profissional|Provider navigation/i})
 await bottom.waitFor({state:'visible',timeout:10_000})
 for(const label of [/In[ií]cio|Home/i,/Pedidos|Orders|Requests/i,/Trabajo|Trabalho|Work|Job/i,/Perfil|Profile/i])await bottom.getByRole('button',{name:label}).first().waitFor({state:'visible',timeout:10_000})
 await page.screenshot({path:'artifacts/provider-ui-mobile.png',fullPage:true})
 results.push({viewport:'mobile',status:'PASS',navigation:'bottom-nav'})

 await verifyVoluntaryLogout(page)
 assert.deepEqual(errors,[],'provider page errors: '+errors.join(' | '))
 results.push({journey:'voluntary-logout',status:'PASS'})
 await fs.writeFile('artifacts/provider-ui-runtime.json',JSON.stringify({task:'provider-ui-runtime',sha,environment:'UGO TEST',authMode:'real-provider-ui-login',refreshes:[refreshOne,refreshTwo].length,results,page_errors:0,completed_at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,environment:'UGO TEST',results}))
}finally{
 if(context)await context.close()
 await browser.close()
}
