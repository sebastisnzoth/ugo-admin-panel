import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',clientEmail=process.env.UGO_TEST_CLIENT_EMAIL||'',clientPassword=process.env.UGO_TEST_CLIENT_PASSWORD||'',providerPassword=process.env.UGO_TEST_PROVIDER_PASSWORD||'',adminEmail=process.env.UGO_TEST_ADMIN_EMAIL||'',adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&clientEmail&&clientPassword&&providerPassword&&adminEmail&&adminPassword&&sha,'CROSS_VISUAL_TEST_INPUTS_REQUIRED')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
await mkdir('artifacts',{recursive:true})
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'cross-visual',sha,environment:'UGO TEST',production_touched:false,routes:{client:false,provider:false,admin:false,superadmin:false},viewports:{desktop:false,mobile:false},screenshots:[],tokens:[],page_errors:[],result:'FAIL'}
let providerId=null,providerEmail='',browser=null
const token=sha.slice(0,8)+'-'+Date.now()
const providerCreatePassword=providerPassword

async function session(email,password){
 const{data,error}=await auth.auth.signInWithPassword({email,password});assert.ifError(error);assert.ok(data.session,'SESSION_REQUIRED '+email);return data.session
}
async function makeProvider(){
 providerEmail=`ugo-cross-visual-${token}@example.test`
 const created=await admin.auth.admin.createUser({email:providerEmail,password:providerCreatePassword,email_confirm:true,user_metadata:{nombre:'UGO Visual TEST',tipo:'proveedor'}});if(created.error)throw created.error
 providerId=created.data.user.id
 let q=await admin.from('usuarios').upsert({id:providerId,nombre:'UGO Visual TEST',tipo:'proveedor',activo:true,es_demo:true,online:false},{onConflict:'id'});if(q.error)throw q.error
 const cat=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(cat.error)throw cat.error
 q=await admin.from('perfiles_proveedor').upsert({usuario_id:providerId,estado_verificacion:'verificado',online:false,disponible:false,onboarding_completo_at:new Date().toISOString(),termos_aceitos_at:new Date().toISOString(),termos_versao:'2026-09-04',categoria_principal_id:cat.data.id,tarifa_base:100},{onConflict:'usuario_id'});if(q.error)throw q.error
}
async function cleanup(){
 if(providerId){await admin.from('perfiles_proveedor').delete().eq('usuario_id',providerId).catch(()=>{});await admin.from('usuarios').delete().eq('id',providerId).catch(()=>{});await admin.auth.admin.deleteUser(providerId).catch(()=>{})}
 if(browser)await browser.close()
}
async function metrics(page,label){
 const m=await page.evaluate(()=>{const root=getComputedStyle(document.documentElement);return{sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bsw:document.body.scrollWidth,bcw:document.body.clientWidth,font:root.getPropertyValue('--ugo-font').trim(),primary:root.getPropertyValue('--ugo-color-primary').trim(),surface:root.getPropertyValue('--ugo-color-surface').trim(),radius:root.getPropertyValue('--ugo-radius-md').trim(),touch:root.getPropertyValue('--ugo-touch-target').trim()}})
 assert.ok(m.sw<=m.cw+4&&m.bsw<=m.bcw+4,label+' horizontal overflow '+JSON.stringify(m))
 for(const k of ['font','primary','surface','radius','touch'])assert.ok(m[k],label+' missing token '+k)
 evidence.tokens.push({label,...m})
}
async function shot(page,label){
 await metrics(page,label)
 const path='artifacts/cross-visual-'+label.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.png'
 await page.screenshot({path,fullPage:true});evidence.screenshots.push(path)
}
async function newPage(viewport){
 const page=await browser.newPage({viewport})
 page.on('pageerror',e=>evidence.page_errors.push(String(e?.stack||e)))
 return page
}

try{
 await makeProvider()
 const clientSession=await session(clientEmail,clientPassword)
 const adminSession=await session(adminEmail,adminPassword)
 browser=await chromium.launch({headless:true})
 for(const [vpName,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
   const client=await newPage(viewport)
   await client.addInitScript(s=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(s)),clientSession)
   await client.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
   await client.locator('.ugo-client-root').waitFor({state:'visible',timeout:30000})
   await shot(client,'client-'+vpName);evidence.routes.client=true
   await client.close()

   const provider=await newPage(viewport)
   await provider.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
   await provider.getByPlaceholder('tu@email.com').fill(providerEmail)
   await provider.getByPlaceholder('Mínimo 6 caracteres').fill(providerCreatePassword)
   await provider.getByRole('button',{name:'Ingresar a UGO'}).click()
   await provider.locator('.ugo-provider-root').waitFor({state:'visible',timeout:30000})
   await shot(provider,'provider-'+vpName);evidence.routes.provider=true
   await provider.close()

   const adminPage=await newPage(viewport)
   await adminPage.addInitScript(s=>localStorage.setItem('ugo-test-admin-auth',JSON.stringify(s)),adminSession)
   await adminPage.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'})
   await adminPage.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:30000})
   await shot(adminPage,'admin-'+vpName);evidence.routes.admin=true
   const superButton=adminPage.getByRole('navigation',{name:'Navegación Admin'}).getByRole('button',{name:'Super Admin',exact:false}).first()
   await superButton.click()
   await adminPage.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:30000})
   await shot(adminPage,'superadmin-'+vpName);evidence.routes.superadmin=true
   await adminPage.close()
   evidence.viewports[vpName]=true
 }
 assert.ok(Object.values(evidence.routes).every(Boolean),'CROSS_VISUAL_ROUTE_MISSING')
 assert.ok(Object.values(evidence.viewports).every(Boolean),'CROSS_VISUAL_VIEWPORT_MISSING')
 assert.equal(evidence.screenshots.length,8,'CROSS_VISUAL_SCREENSHOT_MATRIX_REQUIRED')
 assert.equal(evidence.page_errors.length,0,'CROSS_VISUAL_PAGE_ERRORS')
 const baseline=evidence.tokens[0];for(const t of evidence.tokens){assert.equal(t.font,baseline.font,'FONT_TOKEN_DRIFT '+t.label);assert.equal(t.primary,baseline.primary,'PRIMARY_TOKEN_DRIFT '+t.label);assert.equal(t.surface,baseline.surface,'SURFACE_TOKEN_DRIFT '+t.label);assert.equal(t.radius,baseline.radius,'RADIUS_TOKEN_DRIFT '+t.label);assert.equal(t.touch,baseline.touch,'TOUCH_TOKEN_DRIFT '+t.label)}
 evidence.result='PASS';evidence.completed_at=new Date().toISOString()
 await writeFile('artifacts/cross-visual-runtime.json',JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,routes:evidence.routes,viewports:evidence.viewports,screenshots:evidence.screenshots.length}))
}finally{await cleanup();await auth.auth.signOut().catch(()=>{})}
