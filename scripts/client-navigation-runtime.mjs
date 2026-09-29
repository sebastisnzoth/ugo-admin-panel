import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||''
const password=process.env.UGO_TEST_CLIENT_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'UGO_TEST_CLIENT_RUNTIME_INPUTS_REQUIRED')

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_CLIENT_SESSION_REQUIRED')

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const clickMap=[]
const views=[]
const pageErrors=[]

async function responsive(page,label){
 const m=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bsw:document.body.scrollWidth,bcw:document.body.clientWidth}))
 assert.ok(m.sw<=m.cw+4,label+' document overflow '+JSON.stringify(m))
 assert.ok(m.bsw<=m.bcw+4,label+' body overflow '+JSON.stringify(m))
}
async function snap(page,label){
 const buttons=await page.locator('button:visible').evaluateAll(nodes=>nodes.map(n=>({label:(n.getAttribute('aria-label')||n.textContent||'').replace(/\\s+/g,' ').trim(),disabled:n.disabled})))
 assert.ok(buttons.every(b=>b.label),label+': unlabeled visible button')
 await responsive(page,label)
 views.push({label,buttons:buttons.length,screen:await page.locator('.ugo-client-root').getAttribute('class')})
}
async function openMenu(page){
 const trigger=page.getByRole('button',{name:/Abrir menú/}).first()
 await trigger.waitFor({state:'visible',timeout:20000})
 await trigger.click()
 const drawer=page.getByRole('complementary',{name:'Menú UGO Cliente'})
 await drawer.waitFor({state:'visible',timeout:10000})
 return drawer
}
async function clickMenu(page,label){
 const errorsBefore=pageErrors.length
 const drawer=await openMenu(page)
 const button=drawer.getByRole('button',{name:new RegExp(label,'i')}).first()
 await button.waitFor({state:'visible',timeout:10000})
 assert.equal(await button.isDisabled(),false,label+': disabled')
 await button.click()
 await drawer.waitFor({state:'hidden',timeout:5000})
 await page.waitForTimeout(250)
 assert.equal(pageErrors.length,errorsBefore,label+': pageerror after click')
 clickMap.push({control:label,result:'PASS'})
}
async function freshPage(viewport){
 const page=await browser.newPage({viewport})
 page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
 await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)
 await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
 await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
 return page
}

try{
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const page=await freshPage(viewport)
  try{
   await snap(page,name+' home')

   for(const item of ['Inicio','Actividad y pedidos','Direcciones','Formas de pago','Configuración']){
    await clickMenu(page,item)
    await page.locator('.ugo-client-root').waitFor({state:'visible',timeout:10000})
    if(item==='Actividad y pedidos')await page.locator('.ugo-client-history-wrap').waitFor({state:'visible',timeout:10000})
    if(['Direcciones','Formas de pago','Configuración'].includes(item))await page.getByRole('dialog',{name:'Perfil del cliente'}).waitFor({state:'visible',timeout:10000})
    await snap(page,name+' '+item)
    const dispute=page.locator('.ugo-dispute-backdrop').first()
    if(await dispute.count()&&await dispute.isVisible()){const close=page.locator('.ugo-dispute-sheet header button').first();if(await close.count()&&await close.isVisible())await close.click();else await dispute.click({position:{x:2,y:2},force:true});await dispute.waitFor({state:'hidden',timeout:5000}).catch(()=>{})}
    const notificationClose=page.getByRole('button',{name:'Cerrar notificaciones'}).first()
    if(await notificationClose.count()&&await notificationClose.isVisible())await notificationClose.click()
    const home=page.getByRole('button',{name:/Ir al inicio|Volver al inicio|Volver/}).first()
    if(await home.count()&&await home.isVisible())await home.click()
    await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:10000})
   }

   await clickMenu(page,'Pedir servicio')
   const serviceSearch=page.getByRole('textbox',{name:'Buscar servicio'}); await serviceSearch.waitFor({state:'visible',timeout:10000}); await serviceSearch.evaluate(node=>{if(node!==document.activeElement)throw new Error('Pedir servicio did not focus search')})
   clickMap.push({control:'Pedir servicio focus',result:'PASS'})
   await snap(page,name+' Pedir servicio')

   await clickMenu(page,'Servicios y categorías')
   await page.locator('.ugo-home-services').waitFor({state:'visible',timeout:10000})
   clickMap.push({control:'Servicios y categorías reveal',result:'PASS'})
   await snap(page,name+' Categorías')

   await clickMenu(page,'Notificaciones')
   assert.ok(await page.locator('.ugo-notification-center.role-client').count()>0,'notification center missing')
   await snap(page,name+' Notificaciones')

   for(const item of ['Hugo / Asistente IA','Ayuda y soporte']){
    await clickMenu(page,item)
    await page.locator('.ugo-client-root').waitFor({state:'visible',timeout:10000})
    await snap(page,name+' '+item)
    await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
    await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:10000})
   }

   const headerHome=page.getByRole('button',{name:'Ir al inicio'})
   await headerHome.click()
   await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:10000})
   clickMap.push({control:'Header Ir al inicio',result:'PASS'})

   await page.screenshot({path:'artifacts/client-navigation-'+name+'.png',fullPage:true})
  } finally {await page.close()}
 }

 const logoutPage=await freshPage({width:390,height:844})
 try{
  await clickMenu(logoutPage,'Cerrar sesión')
  await logoutPage.getByRole('heading',{name:/Ingresar|Acceso|Cliente/i}).first().waitFor({state:'visible',timeout:15000})
  clickMap.push({control:'Cerrar sesión auth boundary',result:'PASS'})
 } finally {await logoutPage.close()}

 assert.equal(pageErrors.length,0,'runtime page errors detected')
 const required=['Inicio','Actividad y pedidos','Direcciones','Formas de pago','Configuración','Pedir servicio','Servicios y categorías','Notificaciones','Hugo / Asistente IA','Ayuda y soporte','Header Ir al inicio','Cerrar sesión']
 for(const control of required)assert.ok(clickMap.some(x=>x.control===control||x.control.startsWith(control+' ')),control+': missing runtime coverage')
 const evidence={readiness_id:'client-navigation',task_id:'readiness-client-navigation',job_id:'UGO-READINESS-CLIENT-NAVIGATION',correlation_id:'readiness-client-navigation-20260929T220300Z-ff633eb5',environment:'UGO TEST',sha,tested_url:base+'/?app=client',viewports:['desktop','mobile'],click_map:clickMap,views,page_errors:pageErrors,result:'PASS',completed_at:new Date().toISOString()}
 await fs.writeFile('artifacts/client-navigation-runtime.json',JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,clicks:clickMap.length,views:views.length}))
}finally{
 await browser.close()
 await auth.auth.signOut()
}
