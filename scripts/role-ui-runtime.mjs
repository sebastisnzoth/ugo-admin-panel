// Cross-role browser proof: Cliente + Proveedor + Admin over UGO Arena TEST.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'
import {createRoleUiFixtures} from './role-ui-fixtures.mjs'
import {verifyAdminUserPersistence} from './admin-user-persistence-runtime.mjs'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'

assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&sha,'UGO_TEST_UI_INPUTS_REQUIRED')

async function login(email,password){
 const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 let lastError=null
 for(let attempt=1;attempt<=4;attempt++){
   const {data,error}=await sb.auth.signInWithPassword({email,password})
   if(!error){assert.ok(data.session,'SESSION_REQUIRED');return {sb,session:data.session}}
   lastError=error
   const status=Number(error?.status||0),retryable=status===429||status>=500||/fetch|network|timeout|gateway/i.test(String(error?.message||''))
   if(!retryable||attempt===4)break
   await new Promise(resolve=>setTimeout(resolve,attempt*1000))
 }
 assert.ifError(lastError)
 throw lastError
}
const privileged=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const fixtures=await createRoleUiFixtures(privileged,sha)
try{
const {email:clientEmail,password:clientPassword}=fixtures.identities.client
const {email:providerEmail,password:providerPassword}=fixtures.identities.provider
const {email:adminEmail,password:adminPassword}=fixtures.identities.admin
const client=await login(clientEmail,clientPassword)
const provider=await login(providerEmail,providerPassword)
const admin=await login(adminEmail,adminPassword)

async function retryDb(operation,label){
 let last=null
 for(let attempt=1;attempt<=5;attempt++){
   const result=await operation()
   if(!result?.error)return result
   last=result
   const error=result.error,code=String(error?.code||''),status=Number(error?.status||0),message=String(error?.message||'')
   const retryable=code==='PGRST002'||status===429||status>=500||/schema cache|fetch|network|timeout|gateway|temporar/i.test(message)
   if(!retryable||attempt===5)break
   await new Promise(resolve=>setTimeout(resolve,Math.min(750*attempt,3000)))
 }
 assert.ifError(last?.error,new Error(label+' failed'))
 return last
}
async function ensureOperationalProviderFixture(){
 const providerId=provider.session.user.id
 const {data:profile,error:profileError}=await retryDb(()=>privileged.from('perfiles_proveedor').select('usuario_id,estado_verificacion').eq('usuario_id',providerId).maybeSingle(),'provider profile read')
 assert.ifError(profileError)
 assert.ok(profile,'UGO_TEST_PROVIDER_PROFILE_REQUIRED')
 if(profile.estado_verificacion!=='verificado'){
   const {error:updateError}=await retryDb(()=>privileged.from('perfiles_proveedor').update({estado_verificacion:'verificado'}).eq('usuario_id',providerId),'provider verification update')
   assert.ifError(updateError)
 }
 const {data:verified,error:verifyError}=await retryDb(()=>privileged.from('perfiles_proveedor').select('estado_verificacion').eq('usuario_id',providerId).single(),'provider verification readback')
 assert.ifError(verifyError)
 assert.equal(verified.estado_verificacion,'verificado','UGO_TEST_PROVIDER_MUST_BE_VERIFIED')
}
await ensureOperationalProviderFixture()

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const results=[]
const pageContext=new WeakMap()
const sessions={client:client.session,provider:provider.session,admin:admin.session}
async function freshRoleSession(role){
 const source=role==='client'?client:role==='provider'?provider:admin
 const credentialsForRole=role==='client'?[clientEmail,clientPassword]:role==='provider'?[providerEmail,providerPassword]:[adminEmail,adminPassword]
 let lastError=null
 for(let attempt=1;attempt<=4;attempt++){
   const{data,error}=await source.sb.auth.signInWithPassword({email:credentialsForRole[0],password:credentialsForRole[1]})
   if(!error&&data.session){
     source.session=data.session
     sessions[role]=data.session
     return data.session
   }
   lastError=error||new Error(role+'_FRESH_SESSION_REQUIRED')
   const status=Number(lastError?.status||0)
   const retryable=status===429||status>=500||/fetch|network|timeout|gateway/i.test(String(lastError?.message||''))
   if(!retryable||attempt===4)break
   await new Promise(resolve=>setTimeout(resolve,attempt*1000))
 }
 assert.ifError(lastError)
 throw lastError||new Error(role+'_FRESH_SESSION_REQUIRED')
}

async function assertResponsive(page,label){
 const metrics=await page.evaluate(()=>({
   sw:document.documentElement.scrollWidth,
   cw:document.documentElement.clientWidth,
   bodySw:document.body.scrollWidth,
   bodyCw:document.body.clientWidth
 }))
 assert.ok(metrics.sw<=metrics.cw+4, label+' document horizontal overflow '+JSON.stringify(metrics))
 assert.ok(metrics.bodySw<=metrics.bodyCw+4, label+' body horizontal overflow '+JSON.stringify(metrics))
}

async function openRole(role,viewport){
 const session=await freshRoleSession(role)
 const page=await browser.newPage({viewport})
 const errors=[]
 const trace={step:role+' load'}
 pageContext.set(page,trace)
 page.on('pageerror',error=>errors.push(trace.step+': '+String(error?.message||error)))
 await page.addInitScript(({role,session})=>{
   const key=role==='admin'?'ugo-test-admin-auth':'ugo-test-'+role+'-auth'
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(session))
   if(!localStorage.getItem('ugo.locale.guest.'+role))localStorage.setItem('ugo.locale.guest.'+role,'es')
   if(session.user?.id&&!localStorage.getItem('ugo.locale.'+role+'.'+session.user.id)){localStorage.setItem('ugo.locale.'+role+'.'+session.user.id,'es');localStorage.setItem('ugo.locale.'+role+'.'+session.user.id+'.updatedAt',String(Date.now()))}
 },{role,session})
 await page.goto(base+'/?app='+role,{waitUntil:'domcontentloaded'})
 return {page,errors}
}
const safeClick=async(page,locator,label)=>{
 const trace=pageContext.get(page)
 if(trace)trace.step=label
 await locator.waitFor({state:'visible',timeout:20000})
 await locator.click()
 await page.waitForTimeout(250)
 assert.ok(page.url().startsWith(base),label+' left local TEST runtime unexpectedly')
}
const closeClientOverlay=async page=>{
 const backdrop=page.locator('.ugo-dispute-backdrop').first()
 if(await backdrop.count()&&await backdrop.isVisible()){
   const close=page.locator('.ugo-dispute-sheet header button').first()
   if(await close.count()&&await close.isVisible())await close.click()
   else await backdrop.click({position:{x:2,y:2},force:true})
   await backdrop.waitFor({state:'hidden',timeout:5000}).catch(()=>{})
 }
}
const reopenClientMenu=async page=>{
 await closeClientOverlay(page)
 const trigger=page.getByRole('button',{name:/Abrir menú/}).first()
 const drawer=page.getByRole('complementary',{name:'Menú UGO Cliente'})
 await safeClick(page,trigger,'client menu')
 if(!(await drawer.isVisible().catch(()=>false))){
   await page.waitForTimeout(350)
   await safeClick(page,trigger,'client menu retry after mount')
 }
 await drawer.waitFor({state:'visible',timeout:10000})
}

async function waitForClientHome(page){
 const home=page.getByRole('main',{name:'Inicio'})
 try{
  await home.waitFor({state:'visible',timeout:20000})
 }catch(initialError){
  // A valid session can survive a transient profile request timeout.
  // Exercise the explicit user-visible recovery path; never fake a ready home.
  const retry=page.getByRole('button',{name:/Reintentar carga del perfil/i})
  if(!(await retry.isVisible().catch(()=>false)))throw initialError
  await retry.click()
  await home.waitFor({state:'visible',timeout:20000})
 }
}

async function testClient(viewport,name){
 const {page,errors}=await openRole('client',viewport)
 try{
   await waitForClientHome(page)
   await assertResponsive(page,'client '+name+' home')
   const menuItems=['Inicio','Pedir servicio','Categorías','Actividad','Mis direcciones','Medios de pago','Asistente de Hugo','Ayuda y disputa','Configuración']
   for(const item of menuItems){
     await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
     await waitForClientHome(page)
     await reopenClientMenu(page)
     const drawer=page.getByRole('complementary',{name:'Menú UGO Cliente'})
     await drawer.waitFor({state:'visible'})
     await closeClientOverlay(page)
     const menuList=drawer.locator('.ugo-client-menu-list')
     await safeClick(page,menuList.getByRole('button',{name:new RegExp(item,'i')}).first(), 'client '+item)
     const clientRoot=page.locator('.ugo-client-root')
     try{
       await clientRoot.waitFor({state:'visible',timeout:30000})
     }catch(error){
       const diagnostic=await page.evaluate(()=>({
         url:location.href,
         body:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,1200),
         rootClass:document.querySelector('.ugo-client-root')?.getAttribute('class')||null,
         auth:Boolean(document.querySelector('.mvp-auth-page')),
         onboarding:Boolean(document.querySelector('.ugo-client-onboarding'))
       })).catch(()=>null)
       await page.screenshot({path:'artifacts/role-ui-client-failure-'+name+'-'+item.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.png',fullPage:true}).catch(()=>{})
       throw new Error('CLIENT_RENDER_FAILURE '+name+' item='+item+' diagnostic='+JSON.stringify(diagnostic)+' pageErrors='+errors.join(' | '),{cause:error})
     }
     await assertResponsive(page,'client '+name+' '+item)
   }
   await page.screenshot({path:'artifacts/role-ui-client-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'client page errors: '+errors.join(' | '))
   results.push({role:'client',viewport:name,status:'PASS',menu_items:menuItems.length})
 }catch(error){await page.screenshot({path:'artifacts/role-ui-client-failure-'+name+'.png',fullPage:true}).catch(()=>{});console.error('ROLE_UI_CLIENT_FAILURE',name,(await page.locator('body').innerText().catch(()=>'' )).slice(0,1600));throw error}finally{await page.close()}
}

async function testProvider(viewport,name){
 const page=await browser.newPage({viewport})
 const errors=[],trace={step:'provider UI login'}
 pageContext.set(page,trace)
 page.on('pageerror',error=>errors.push(trace.step+': '+String(error?.message||error)))
 try{
   await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
   await page.getByTestId('language-selector').selectOption('es')
   const authEmail=page.getByTestId('auth-email')
   await authEmail.waitFor({state:'visible',timeout:20000})
   await authEmail.fill(providerEmail)
   await page.getByTestId('auth-password').fill(providerPassword)
   await page.getByTestId('auth-password').press('Enter')
   await Promise.race([
     page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:30000}),
     page.getByRole('alert').filter({hasText:/error|inválid|incorrect|falló|falhou|failed/i}).waitFor({state:'visible',timeout:30000}).then(async()=>{throw new Error('PROVIDER_LOGIN_ERROR '+(await page.locator('body').innerText()).slice(0,1200))})
   ])
   await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:30000})
   await page.getByTestId('language-selector').selectOption('es')
   await assertResponsive(page,'provider '+name+' home')
   let checkedItems=0
   if(viewport.width>=1000){
     const nav=page.getByRole('navigation',{name:'Navegación principal'}).first()
     const items=[/Inicio/i,/Pedidos/i,/Trabajo activo|Mis trabajos/i,/Historial/i,/Ganancias/i,/Perfil/i]
     for(const item of items){
       await safeClick(page,nav.getByRole('button',{name:item}).first(),'provider '+String(item))
       await page.waitForFunction(()=>document.querySelector('.ugo-provider-root')||document.body.textContent?.includes('No pudimos cargar esta pantalla'),null,{timeout:30000})
       const providerRoot=page.locator('.ugo-provider-root')
       if(!(await providerRoot.isVisible().catch(()=>false))){
         await page.screenshot({path:'artifacts/role-ui-provider-failure-'+name+'.png',fullPage:true})
         throw new Error('PROVIDER_RENDER_FAILURE '+name+' item='+String(item)+' pageErrors='+errors.join(' | '))
       }
       await assertResponsive(page,'provider '+name+' '+String(item))
     }
     const menu=page.getByRole('complementary',{name:'Menú proveedor'})
     await safeClick(page,menu.getByRole('button',{name:/Ayuda/i}),'provider Ayuda')
     await assertResponsive(page,'provider '+name+' Ayuda')
     checkedItems=items.length+1
   }else{
     const nav=page.getByRole('navigation',{name:'Navegación proveedor'}).first()
     const items=['home','orders','work','profile']
     for(const item of items){
       const navLabel=String(item)
       console.info('UGO_ROLE_UI_PROVIDER_MOBILE_NAV_START',name,navLabel)
       await safeClick(page,page.getByTestId('provider-mobile-'+item),'provider mobile '+navLabel)
       try{
         await page.waitForFunction(()=>document.querySelector('.ugo-provider-root')||document.body.textContent?.includes('No pudimos cargar esta pantalla'),null,{timeout:30000})
       }catch(error){
         const snapshot=await page.locator('body').innerText().catch(()=> '')
         console.error('UGO_ROLE_UI_PROVIDER_MOBILE_NAV_FAILURE',name,navLabel,'url='+page.url(),'pageErrors='+errors.join(' | '),'body='+snapshot.slice(0,1200))
         await page.screenshot({path:'artifacts/role-ui-provider-failure-'+name+'.png',fullPage:true}).catch(()=>{})
         throw error
       }
       const providerRoot=page.locator('.ugo-provider-root')
       if(!(await providerRoot.isVisible().catch(()=>false))){
         await page.screenshot({path:'artifacts/role-ui-provider-failure-'+name+'.png',fullPage:true})
         throw new Error('PROVIDER_RENDER_FAILURE '+name+' item='+String(item)+' pageErrors='+errors.join(' | '))
       }
       await assertResponsive(page,'provider '+name+' '+String(item))
     }
     checkedItems=items.length
   }
   await page.screenshot({path:'artifacts/role-ui-provider-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'provider page errors: '+errors.join(' | '))
   results.push({role:'provider',viewport:name,status:'PASS',menu_items:checkedItems})
 } finally {await page.close()}
}

async function testAdminAuthBoundary(viewport,name){
 const cases=[
   {actor:'anonymous',session:null,expectsError:false},
   {actor:'client',session:client.session,expectsError:true},
   {actor:'provider',session:provider.session,expectsError:true},
 ]
 for(const item of cases){
   const page=await browser.newPage({viewport})
   try{
     await page.addInitScript(()=>localStorage.setItem('ugo.locale.guest.admin','es'))
     if(item.session)await page.addInitScript(session=>localStorage.setItem('ugo-test-admin-auth',JSON.stringify(session)),item.session)
     await page.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'})
     await page.getByTestId('language-selector').waitFor({state:'visible',timeout:20000})
     assert.equal(await page.getByRole('navigation',{name:'Navegación Admin'}).count(),0,item.actor+' must not receive Admin navigation')
     if(item.expectsError)await page.getByRole('alert').filter({hasText:/Acceso denegado|Access denied|Acesso negado/i}).waitFor({state:'visible',timeout:10000})
     await assertResponsive(page,'admin auth denied '+item.actor+' '+name)
     results.push({role:'admin-auth',actor:item.actor,viewport:name,status:'PASS',access:'DENIED'})
   } finally {await page.close()}
 }
}

async function testAdministrativeSession(viewport,name,key){
 const identity=fixtures.identities[key]
 const superRole=key==='admin'
 const persistedRole=await privileged.from('usuarios').select('tipo,activo').eq('id',identity.id).single()
 assert.ifError(persistedRole.error)
 assert.equal(persistedRole.data.tipo,superRole?'superadmin':'admin')
 assert.equal(persistedRole.data.activo,true)
 if(!superRole){
  const ordinary=await login(identity.email,identity.password)
  try{
   const denied=await ordinary.sb.from('usuarios').update({nombre:'Unauthorized QA edit'}).eq('id',fixtures.identities.admin.id).select('id')
   assert.ok(denied.error||!denied.data?.length,'ADMIN_COULD_EDIT_PRIVILEGED_ACCOUNT_DIRECTLY')
  }finally{await ordinary.sb.auth.signOut({scope:'local'})}
 }
 const page=await browser.newPage({viewport})
 try{
  await page.goto(base+'/?app='+(superRole?'superadmin':'admin'),{waitUntil:'domcontentloaded'})
  await page.getByTestId('language-selector').selectOption('es')
  await page.locator('form input[type="text"]').fill(identity.email)
  await page.locator('form input[type="password"]').fill(identity.password)
  const storedPreference=await privileged.auth.admin.getUserById(identity.id)
  assert.ifError(storedPreference.error)
  const restoredLocale=storedPreference.data.user.user_metadata?.preferred_language
  await page.locator('form input[type="password"]').press('Enter')
  await page.locator('.ugo-admin2').waitFor({state:'visible',timeout:30000})
  if(restoredLocale)await page.waitForFunction(value=>document.documentElement.lang===value,restoredLocale)
  // The prior desktop translation case legitimately persisted this account's English choice.
  // Select Spanish inside the authenticated UI before using Spanish accessible names.
  await page.getByTestId('language-selector').first().selectOption('es')
  await page.waitForFunction(()=>document.documentElement.lang==='es')
  const navigation=page.getByRole('navigation',{name:'Navegación Admin'})
  await navigation.waitFor({state:'visible',timeout:30000})
  if(!superRole)assert.equal(await navigation.getByRole('button',{name:/Super Admin/}).count(),0,'ADMIN_MUST_NOT_EXPOSE_SUPERADMIN')
  await page.reload({waitUntil:'domcontentloaded'})
  await navigation.waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await page.waitForURL(url=>url.searchParams.get('auth')==='1',{timeout:10000})
  await page.getByTestId('language-selector').waitFor({state:'visible',timeout:20000})
  assert.equal(await page.evaluate(()=>localStorage.getItem('ugo-test-admin-auth')),null,'LOGOUT_LEFT_ADMIN_SESSION')
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByTestId('language-selector').waitFor({state:'visible',timeout:20000})
  assert.equal(await navigation.count(),0,'LOGOUT_RESTORED_PROTECTED_UI')
  results.push({role:superRole?'superadmin-session':'admin-session',viewport:name,status:'PASS',ui_login:true,reload:true,logout:true})
 }catch(error){console.error('ADMIN_SESSION_FAILURE',key,name,JSON.stringify({lang:await page.locator('html').getAttribute('lang'),adminShell:await page.locator('.ugo-admin2').count(),loginForm:await page.locator('form input[type=password]').count()}));throw error}finally{await page.close()}
}

async function testAutonomyControl(page,name){
 const before=await privileged.from('autonomous_company_state').select('mode,updated_by').maybeSingle()
 assert.ifError(before.error)
 // Do not override the operator's live TEST autonomy setting. Mutating a
 // non-idle state would interfere with autonomous jobs and manual operations.
 if(before.data?.mode!=='OFF'){
  assert.ok(['SHADOW','ON'].includes(before.data?.mode),'AUTONOMY_UNRECOGNIZED_STATE')
  const active=page.getByRole('radio',{name:new RegExp('^'+before.data.mode+'
  results.push({role:'superadmin-autonomy-control',viewport:name,status:'SKIPPED',reason:'NON_IDLE_TEST_STATE',observed_mode:before.data.mode,read_only_state_verified:true,transition_tested:false})
  return
 }
 const actor=sessions.admin.user.id
 try{
  await page.getByRole('radio',{name:/SHADOW/}).click()
  await page.waitForFunction(()=>document.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.includes('SHADOW'),null,{timeout:20000})
  const shadow=await privileged.from('autonomous_company_state').select('mode,updated_by').maybeSingle()
  assert.ifError(shadow.error)
  assert.equal(shadow.data.mode,'SHADOW')
  assert.equal(shadow.data.updated_by,actor)
  await page.getByRole('radio',{name:/OFF/}).click()
  await page.waitForFunction(()=>document.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.includes('OFF'),null,{timeout:20000})
  const off=await privileged.from('autonomous_company_state').select('mode').maybeSingle()
  assert.ifError(off.error)
  assert.equal(off.data.mode,'OFF')
  results.push({role:'superadmin-autonomy-control',viewport:name,status:'PASS',api:'exact-source local TEST',shadow_persisted:true,off_restored:true})
 }finally{
  const current=await privileged.from('autonomous_company_state').select('mode,updated_by').maybeSingle()
  assert.ifError(current.error)
  if(current.data?.mode==='SHADOW'&&current.data.updated_by===actor){
   const response=await fetch('http://127.0.0.1:4174/api/operations?op=autonomy-mode',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessions.admin.access_token},body:JSON.stringify({mode:'OFF',reason:'Restore transient TEST UI probe'})})
   assert.equal(response.ok,true,'AUTONOMY_TEST_RESTORE_FAILED')
  }
 }
}

async function testAdmin(viewport,name){
 const {page,errors}=await openRole('admin',viewport)
 try{
   await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:20000})
   await assertResponsive(page,'admin '+name+' home')
   const mainNav=page.getByRole('navigation',{name:'Navegación Admin'})
   const superAdminButton=mainNav.getByRole('button',{name:/Super Admin/i})
   await superAdminButton.waitFor({state:'visible',timeout:30000})
   const mainItems=['Inicio','Operaciones','Personas','Finanzas','Configuración','Super Admin']
   for(const item of mainItems){
     await safeClick(page,mainNav.getByRole('button',{name:new RegExp(item,'i')}),'admin '+item)
     await assertResponsive(page,'admin '+name+' '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Operaciones/i}),'admin Operaciones')
   const operations=page.getByRole('group',{name:'Menú de operaciones'})
   for(const item of ['Resumen','Mapa','Servicios','Alertas','Disputas','Scout','Historial','Mensajes']){
     await safeClick(page,operations.getByRole('button',{name:new RegExp(item,'i')}),'admin op '+item)
     await assertResponsive(page,'admin '+name+' op '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Personas/i}),'admin Personas')
   for(const item of ['Usuarios','Verificación','Documentos','KYC','Importar']){
     await safeClick(page,page.getByRole('group',{name:'Personas'}).getByRole('button',{name:new RegExp(item,'i')}),'admin people '+item)
     await assertResponsive(page,'admin '+name+' people '+item)
   }
   results.push({role:'admin-user-persistence',...(await verifyAdminUserPersistence({page,db:privileged,client:client.sb,sha,session:sessions.admin}))})
   await safeClick(page,mainNav.getByRole('button',{name:/Finanzas/i}),'admin Finanzas')
   for(const item of ['PIX','Bóveda y retiros','Tarifas']){
     await safeClick(page,page.getByRole('group',{name:'Finanzas'}).getByRole('button',{name:new RegExp(item,'i')}),'admin finance '+item)
     await assertResponsive(page,'admin '+name+' finance '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Configuración/i}),'admin Configuración')
   for(const item of ['Categorías','Analytics|Análisis|Análises','Notificaciones','Reportes','Sistema']){
     await safeClick(page,item.includes('Analytics')?page.getByTestId('admin-settings-analytics'):page.getByRole('group',{name:'Configuración'}).getByRole('button',{name:new RegExp(item,'i')}),'admin settings '+item)
     await assertResponsive(page,'admin '+name+' settings '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Super Admin/i}),'admin Super Admin')
   await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).waitFor({state:'visible',timeout:10000})
   await safeClick(page,page.getByRole('button',{name:'Empresa Autónoma',exact:true}),'admin Empresa Autónoma')
   for(const item of ['overview','live','departments','agents','inbox','ledgers','audit','qa','models','launch','empresas','controls']){
     await safeClick(page,page.getByTestId('autonomy-view-'+item),'autonomous '+item)
     await assertResponsive(page,'admin '+name+' autonomous '+item)
   }
   if(name==='desktop')await testAutonomyControl(page,name)
   await page.screenshot({path:'artifacts/role-ui-admin-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'admin page errors: '+errors.join(' | '))
   results.push({role:'admin',viewport:name,status:'PASS',main_items:mainItems.length,autonomous_items:12})
 } finally {await page.close()}
}

async function testTranslations(role,viewport,name){
 const {page,errors}=await openRole(role==='superadmin'?'admin':role,viewport)
 try{
  // Preserve authenticated Profile overlay after prior client flow; never accept login as a translation check.
  const root=role==='client'?'.ugo-client-root,.ugo-client-profile-panel':role==='provider'?'.ugo-provider-root':'.ugo-admin2'
  await page.locator(root).waitFor({state:'visible',timeout:30000})
  if(role==='superadmin')await page.getByRole('navigation',{name:'Navegación Admin'}).getByRole('button',{name:/Super Admin/}).click()
  for(const locale of ['pt-BR','en','es']){
   if(role==='client')await page.evaluate(()=>window.dispatchEvent(new Event('ugo:client-menu-open')))
   const selector=page.getByTestId('language-selector').first()
   await selector.selectOption(locale)
   await page.waitForFunction(value=>document.documentElement.lang===value,locale)
   await assertResponsive(page,role+' '+locale+' '+name)
   const snapshot=await page.locator('body').innerText()
   assert.ok(!/\b(?:clientNeed|clientTracking|clientAssigned|clientSummary|screen\.need|providerRoot)\.[A-Za-z0-9_.-]+/.test(snapshot),'visible translation key '+role+' '+locale)
   await page.reload({waitUntil:'domcontentloaded'})
   await page.locator(root).waitFor({state:'visible',timeout:30000})
   await page.waitForFunction(value=>document.documentElement.lang===value,locale)
   results.push({role,locale,viewport:name,status:'PASS',checks:['language switch','reload persistence','no visible keys','responsive']})
  }
  assert.deepEqual(errors,[],role+' language page errors')
 }finally{await page.close()}
}

try{
 const viewports=[['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]
 for(const [name,viewport] of viewports){
   await freshRoleSession('client')
   await freshRoleSession('admin')
   await testAdminAuthBoundary(viewport,name)
   await testAdministrativeSession(viewport,name,'operator')
   await testAdministrativeSession(viewport,name,'admin')
   await testAdmin(viewport,name)
   await testClient(viewport,name)
   await freshRoleSession('provider')
   await testProvider(viewport,name)
   for(const role of ['client','provider','admin','superadmin'])await testTranslations(role,viewport,name)
 }
 await fs.writeFile('artifacts/role-ui-runtime.json',JSON.stringify({task:'role-ui-runtime',sha,environment:'UGO TEST',results,page_errors:0,completed_at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,results}))
} finally {
 await browser.close()
 await Promise.allSettled([client.sb.auth.signOut(),provider.sb.auth.signOut(),admin.sb.auth.signOut()])
}
}finally{await fixtures.cleanup()}
)})
  await active.waitFor({state:'visible',timeout:20000})
  // Async Admin hydration must converge with the persisted TEST state.
  // Assert both the UI radio and authoritative DB after the asynchronous refresh.
  await page.waitForFunction(expected=>{
   const options=[...document.querySelectorAll('[role="radio"]')]
   return options.some(node=>node.textContent?.trim()===expected&&node.getAttribute('aria-checked')==='true')
  },before.data.mode,{timeout:20000})
  const current=await privileged.from('autonomous_company_state').select('mode').maybeSingle()
  assert.ifError(current.error)
  assert.equal(current.data?.mode,before.data.mode,'AUTONOMY_TEST_MODE_CHANGED_DURING_PROOF')
  results.push({role:'superadmin-autonomy-control',viewport:name,status:'SKIPPED',reason:'NON_IDLE_TEST_STATE',observed_mode:before.data.mode,read_only_state_verified:true,transition_tested:false})
  return
 }
 const actor=sessions.admin.user.id
 try{
  await page.getByRole('radio',{name:/SHADOW/}).click()
  await page.waitForFunction(()=>document.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.includes('SHADOW'),null,{timeout:20000})
  const shadow=await privileged.from('autonomous_company_state').select('mode,updated_by').maybeSingle()
  assert.ifError(shadow.error)
  assert.equal(shadow.data.mode,'SHADOW')
  assert.equal(shadow.data.updated_by,actor)
  await page.getByRole('radio',{name:/OFF/}).click()
  await page.waitForFunction(()=>document.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.includes('OFF'),null,{timeout:20000})
  const off=await privileged.from('autonomous_company_state').select('mode').maybeSingle()
  assert.ifError(off.error)
  assert.equal(off.data.mode,'OFF')
  results.push({role:'superadmin-autonomy-control',viewport:name,status:'PASS',api:'exact-source local TEST',shadow_persisted:true,off_restored:true})
 }finally{
  const current=await privileged.from('autonomous_company_state').select('mode,updated_by').maybeSingle()
  assert.ifError(current.error)
  if(current.data?.mode==='SHADOW'&&current.data.updated_by===actor){
   const response=await fetch('http://127.0.0.1:4174/api/operations?op=autonomy-mode',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessions.admin.access_token},body:JSON.stringify({mode:'OFF',reason:'Restore transient TEST UI probe'})})
   assert.equal(response.ok,true,'AUTONOMY_TEST_RESTORE_FAILED')
  }
 }
}

async function testAdmin(viewport,name){
 const {page,errors}=await openRole('admin',viewport)
 try{
   await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:20000})
   await assertResponsive(page,'admin '+name+' home')
   const mainNav=page.getByRole('navigation',{name:'Navegación Admin'})
   const superAdminButton=mainNav.getByRole('button',{name:/Super Admin/i})
   await superAdminButton.waitFor({state:'visible',timeout:30000})
   const mainItems=['Inicio','Operaciones','Personas','Finanzas','Configuración','Super Admin']
   for(const item of mainItems){
     await safeClick(page,mainNav.getByRole('button',{name:new RegExp(item,'i')}),'admin '+item)
     await assertResponsive(page,'admin '+name+' '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Operaciones/i}),'admin Operaciones')
   const operations=page.getByRole('group',{name:'Menú de operaciones'})
   for(const item of ['Resumen','Mapa','Servicios','Alertas','Disputas','Scout','Historial','Mensajes']){
     await safeClick(page,operations.getByRole('button',{name:new RegExp(item,'i')}),'admin op '+item)
     await assertResponsive(page,'admin '+name+' op '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Personas/i}),'admin Personas')
   for(const item of ['Usuarios','Verificación','Documentos','KYC','Importar']){
     await safeClick(page,page.getByRole('group',{name:'Personas'}).getByRole('button',{name:new RegExp(item,'i')}),'admin people '+item)
     await assertResponsive(page,'admin '+name+' people '+item)
   }
   results.push({role:'admin-user-persistence',...(await verifyAdminUserPersistence({page,db:privileged,client:client.sb,sha,session:sessions.admin}))})
   await safeClick(page,mainNav.getByRole('button',{name:/Finanzas/i}),'admin Finanzas')
   for(const item of ['PIX','Bóveda y retiros','Tarifas']){
     await safeClick(page,page.getByRole('group',{name:'Finanzas'}).getByRole('button',{name:new RegExp(item,'i')}),'admin finance '+item)
     await assertResponsive(page,'admin '+name+' finance '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Configuración/i}),'admin Configuración')
   for(const item of ['Categorías','Analytics|Análisis|Análises','Notificaciones','Reportes','Sistema']){
     await safeClick(page,item.includes('Analytics')?page.getByTestId('admin-settings-analytics'):page.getByRole('group',{name:'Configuración'}).getByRole('button',{name:new RegExp(item,'i')}),'admin settings '+item)
     await assertResponsive(page,'admin '+name+' settings '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Super Admin/i}),'admin Super Admin')
   await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).waitFor({state:'visible',timeout:10000})
   await safeClick(page,page.getByRole('button',{name:'Empresa Autónoma',exact:true}),'admin Empresa Autónoma')
   for(const item of ['overview','live','departments','agents','inbox','ledgers','audit','qa','models','launch','empresas','controls']){
     await safeClick(page,page.getByTestId('autonomy-view-'+item),'autonomous '+item)
     await assertResponsive(page,'admin '+name+' autonomous '+item)
   }
   if(name==='desktop')await testAutonomyControl(page,name)
   await page.screenshot({path:'artifacts/role-ui-admin-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'admin page errors: '+errors.join(' | '))
   results.push({role:'admin',viewport:name,status:'PASS',main_items:mainItems.length,autonomous_items:12})
 } finally {await page.close()}
}

async function testTranslations(role,viewport,name){
 const {page,errors}=await openRole(role==='superadmin'?'admin':role,viewport)
 try{
  // Preserve authenticated Profile overlay after prior client flow; never accept login as a translation check.
  const root=role==='client'?'.ugo-client-root,.ugo-client-profile-panel':role==='provider'?'.ugo-provider-root':'.ugo-admin2'
  await page.locator(root).waitFor({state:'visible',timeout:30000})
  if(role==='superadmin')await page.getByRole('navigation',{name:'Navegación Admin'}).getByRole('button',{name:/Super Admin/}).click()
  for(const locale of ['pt-BR','en','es']){
   if(role==='client')await page.evaluate(()=>window.dispatchEvent(new Event('ugo:client-menu-open')))
   const selector=page.getByTestId('language-selector').first()
   await selector.selectOption(locale)
   await page.waitForFunction(value=>document.documentElement.lang===value,locale)
   await assertResponsive(page,role+' '+locale+' '+name)
   const snapshot=await page.locator('body').innerText()
   assert.ok(!/\b(?:clientNeed|clientTracking|clientAssigned|clientSummary|screen\.need|providerRoot)\.[A-Za-z0-9_.-]+/.test(snapshot),'visible translation key '+role+' '+locale)
   await page.reload({waitUntil:'domcontentloaded'})
   await page.locator(root).waitFor({state:'visible',timeout:30000})
   await page.waitForFunction(value=>document.documentElement.lang===value,locale)
   results.push({role,locale,viewport:name,status:'PASS',checks:['language switch','reload persistence','no visible keys','responsive']})
  }
  assert.deepEqual(errors,[],role+' language page errors')
 }finally{await page.close()}
}

try{
 const viewports=[['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]
 for(const [name,viewport] of viewports){
   await freshRoleSession('client')
   await freshRoleSession('admin')
   await testAdminAuthBoundary(viewport,name)
   await testAdministrativeSession(viewport,name,'operator')
   await testAdministrativeSession(viewport,name,'admin')
   await testAdmin(viewport,name)
   await testClient(viewport,name)
   await freshRoleSession('provider')
   await testProvider(viewport,name)
   for(const role of ['client','provider','admin','superadmin'])await testTranslations(role,viewport,name)
 }
 await fs.writeFile('artifacts/role-ui-runtime.json',JSON.stringify({task:'role-ui-runtime',sha,environment:'UGO TEST',results,page_errors:0,completed_at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,results}))
} finally {
 await browser.close()
 await Promise.allSettled([client.sb.auth.signOut(),provider.sb.auth.signOut(),admin.sb.auth.signOut()])
}
}finally{await fixtures.cleanup()}
