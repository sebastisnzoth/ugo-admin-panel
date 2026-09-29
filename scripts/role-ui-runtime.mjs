import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const clientEmail=process.env.UGO_TEST_CLIENT_EMAIL||''
const clientPassword=process.env.UGO_TEST_CLIENT_PASSWORD||''
const providerEmail=process.env.UGO_TEST_PROVIDER_EMAIL||''
const providerPassword=process.env.UGO_TEST_PROVIDER_PASSWORD||''
const adminEmail=process.env.UGO_TEST_ADMIN_EMAIL||''
const adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'

assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&clientEmail&&clientPassword&&providerEmail&&providerPassword&&adminEmail&&adminPassword&&sha,'UGO_TEST_UI_INPUTS_REQUIRED')

async function login(email,password){
 const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await sb.auth.signInWithPassword({email,password})
 assert.ifError(error); assert.ok(data.session,'SESSION_REQUIRED')
 return {sb,session:data.session}
}
const client=await login(clientEmail,clientPassword)
const provider=await login(providerEmail,providerPassword)
const admin=await login(adminEmail,adminPassword)

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const results=[]
const sessions={client:client.session,provider:provider.session,admin:admin.session}

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
 const page=await browser.newPage({viewport})
 const errors=[]
 page.on('pageerror',error=>errors.push(String(error?.message||error)))
 await page.addInitScript(({role,session})=>{
   const key=role==='admin'?'ugo-test-admin-auth':'ugo-test-'+role+'-auth'
   localStorage.setItem(key,JSON.stringify(session))
 },{role,session:sessions[role]})
 await page.goto(base+'/?app='+role,{waitUntil:'domcontentloaded'})
 return {page,errors}
}
const safeClick=async(page,locator,label)=>{
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
 await safeClick(page,page.getByRole('button',{name:/Abrir menú/}).first(),'client menu')
}

async function testClient(viewport,name){
 const {page,errors}=await openRole('client',viewport)
 try{
   await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
   await assertResponsive(page,'client '+name+' home')
   const menuItems=['Inicio','Pedir servicio','Servicios y categorías','Actividad y pedidos','Direcciones','Formas de pago','Hugo / Asistente IA','Ayuda y soporte','Configuración']
   for(const item of menuItems){
     await reopenClientMenu(page)
     const drawer=page.getByRole('complementary',{name:'Menú UGO Cliente'})
     await drawer.waitFor({state:'visible'})
     await safeClick(page,drawer.getByRole('button',{name:new RegExp(item,'i')}), 'client '+item)
     await page.locator('.ugo-client-root').waitFor({state:'visible',timeout:10000})
     await assertResponsive(page,'client '+name+' '+item)
   }
   await page.screenshot({path:'artifacts/role-ui-client-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'client page errors: '+errors.join(' | '))
   results.push({role:'client',viewport:name,status:'PASS',menu_items:menuItems.length})
 } finally {await page.close()}
}

async function testProvider(viewport,name){
 const {page,errors}=await openRole('provider',viewport)
 try{
   await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:20000})
   await assertResponsive(page,'provider '+name+' home')
   const nav=page.getByRole('navigation',{name:'Navegación principal'}).first()
   const items=[/Inicio/i,/Trabajos/i,/Calendario/i,/Ganancias/i,/Historial/i,/Perfil/i]
   for(const item of items){
     await safeClick(page,nav.getByRole('button',{name:item}).first(),'provider '+String(item))
     await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:10000})
     await assertResponsive(page,'provider '+name+' '+String(item))
   }
   const menu=page.getByRole('complementary',{name:'Menú proveedor'})
   await safeClick(page,menu.getByRole('button',{name:/Ayuda/i}),'provider Ayuda')
   await assertResponsive(page,'provider '+name+' Ayuda')
   await page.screenshot({path:'artifacts/role-ui-provider-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'provider page errors: '+errors.join(' | '))
   results.push({role:'provider',viewport:name,status:'PASS',menu_items:items.length+1})
 } finally {await page.close()}
}

async function testAdmin(viewport,name){
 const {page,errors}=await openRole('admin',viewport)
 try{
   await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:20000})
   await assertResponsive(page,'admin '+name+' home')
   const mainNav=page.getByRole('navigation',{name:'Navegación Admin'})
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
   await safeClick(page,mainNav.getByRole('button',{name:/Finanzas/i}),'admin Finanzas')
   for(const item of ['PIX','Bóveda y retiros','Tarifas']){
     await safeClick(page,page.getByRole('group',{name:'Finanzas'}).getByRole('button',{name:new RegExp(item,'i')}),'admin finance '+item)
     await assertResponsive(page,'admin '+name+' finance '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Configuración/i}),'admin Configuración')
   for(const item of ['Categorías','Analytics','Notificaciones','Reportes','Sistema']){
     await safeClick(page,page.getByRole('group',{name:'Configuración'}).getByRole('button',{name:new RegExp(item,'i')}),'admin settings '+item)
     await assertResponsive(page,'admin '+name+' settings '+item)
   }
   await safeClick(page,mainNav.getByRole('button',{name:/Super Admin/i}),'admin Super Admin')
   await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).waitFor({state:'visible',timeout:10000})
   await safeClick(page,page.getByRole('button',{name:'Empresa Autónoma',exact:true}),'admin Empresa Autónoma')
   for(const item of ['Centro de mando','Operación en vivo','Departamentos','Agentes IA','Inbox ejecutivo','Ledgers','Riesgo & Auditoría','QA Lab','Model Router','Launch Gate','UGO Empresas','Kill Switch']){
     await safeClick(page,page.getByRole('button',{name:item,exact:true}),'autonomous '+item)
     await assertResponsive(page,'admin '+name+' autonomous '+item)
   }
   await page.screenshot({path:'artifacts/role-ui-admin-'+name+'.png',fullPage:true})
   assert.deepEqual(errors,[],'admin page errors: '+errors.join(' | '))
   results.push({role:'admin',viewport:name,status:'PASS',main_items:mainItems.length,autonomous_items:12})
 } finally {await page.close()}
}

try{
 const viewports=[['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]
 for(const [name,viewport] of viewports){
   await testClient(viewport,name)
   await testProvider(viewport,name)
   await testAdmin(viewport,name)
 }
 await fs.writeFile('artifacts/role-ui-runtime.json',JSON.stringify({task:'role-ui-runtime',sha,environment:'UGO TEST',results,page_errors:0,completed_at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,results}))
} finally {
 await browser.close()
 await Promise.allSettled([client.sb.auth.signOut(),provider.sb.auth.signOut(),admin.sb.auth.signOut()])
}
