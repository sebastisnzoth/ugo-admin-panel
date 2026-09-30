import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',email=process.env.UGO_TEST_PROVIDER_EMAIL||'',password=process.env.UGO_TEST_PROVIDER_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&email&&password&&sha,'PILOT_PROVIDER_RUNTIME_INPUTS_REQUIRED')
const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await sb.auth.signInWithPassword({email,password});assert.ifError(loginError);assert.ok(login.session&&login.user)
const providerId=login.user.id
const{data:original,error:profileError}=await sb.from('perfiles_proveedor').select('usuario_id,estado_verificacion,categoria_principal_id,pilot_capabilities').eq('usuario_id',providerId).single();assert.ifError(profileError);assert.equal(original.estado_verificacion,'verificado','UGO_TEST_PROVIDER_MUST_BE_VERIFIED')
const{data:originalRefs,error:refsError}=await sb.from('proveedor_referencias_laborales').select('nombre,relacion,contacto,autorizado_contacto').eq('proveedor_id',providerId);assert.ifError(refsError)
const{data:cats,error:catError}=await sb.from('categorias').select('id,nombre,slug').in('slug',['faxina','marido-de-aluguel']);assert.ifError(catError);assert.equal(cats?.length,2)
await fs.mkdir('artifacts',{recursive:true});const browser=await chromium.launch({headless:true}),results=[]
async function testKind(kind){
 const category=cats.find(c=>c.slug===(kind==='faxina'?'faxina':'marido-de-aluguel'));assert.ok(category)
 const{error:setCategoryError}=await sb.from('perfiles_proveedor').update({categoria_principal_id:category.id,pilot_capabilities:{}}).eq('usuario_id',providerId);assert.ifError(setCategoryError)
 const page=await browser.newPage({viewport:{width:430,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)))
 await page.addInitScript(session=>localStorage.setItem('ugo-test-provider-auth',JSON.stringify(session)),login.session)
 try{
  await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'});await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:20000});await page.getByRole('button',{name:/Perfil proveedor/}).click()
  const config=page.getByText('Configuración del piloto',{exact:true});await config.waitFor({state:'visible',timeout:15000});await config.click()
  if(kind==='faxina'){await page.getByLabel('Productos de limpieza').fill('Proveedor lleva productos neutros; cliente informa alergias.');await page.getByLabel('Equipamiento').fill('Aspiradora, paños, mop y escalera doméstica.');await page.getByLabel('Restricciones').fill('Sin químicos industriales ni limpieza en altura.')}
  else{await page.getByLabel('Herramientas').fill('Taladro, atornilladores, nivel y herramientas manuales.');await page.getByLabel('Transporte').fill('Vehículo liviano para herramientas y piezas pequeñas.');await page.getByLabel('Materiales/repuestos').fill('Cliente aprueba compra antes de cualquier extra.');await page.getByLabel('Forma de cotización').fill('Por tarea o visita, extras sólo con aprobación.');await page.getByLabel('Límites de trabajo').fill('Sin gas, estructura, tablero eléctrico ni tareas sobre 2 m.');await page.getByLabel('Habilitaciones/certificaciones').fill('Sólo tareas no reguladas dentro del piloto.')}
  const names=page.getByLabel('Nombre');const relations=page.getByLabel('Relación');const contacts=page.getByLabel('Teléfono / WhatsApp');const consents=page.getByText(/Autorizo a UGO a contactar esta referencia/).locator('input')
  await names.nth(0).fill('Referencia Piloto TEST');await relations.nth(0).fill('Cliente TEST');await contacts.nth(0).fill('+55 48 99999-0000');await consents.nth(0).check()
  await page.getByRole('button',{name:'Guardar configuración del piloto'}).click();await page.getByText('Configuración del piloto guardada.').waitFor({state:'visible',timeout:15000})
  const{data:profile,error:pErr}=await sb.from('perfiles_proveedor').select('categoria_principal_id,pilot_capabilities').eq('usuario_id',providerId).single();assert.ifError(pErr);assert.equal(String(profile.categoria_principal_id),String(category.id))
  const{data:refs,error:rErr}=await sb.from('proveedor_referencias_laborales').select('nombre,relacion,contacto,autorizado_contacto').eq('proveedor_id',providerId);assert.ifError(rErr);assert.equal(refs?.length,1);assert.equal(refs[0].autorizado_contacto,true)
  if(kind==='faxina')for(const k of ['products','equipment','restrictions'])assert.ok(profile.pilot_capabilities?.[k]);else for(const k of ['tools','transport','materials','quoteMode','workLimits','certifications'])assert.ok(profile.pilot_capabilities?.[k])
  assert.deepEqual(errors,[]);await page.screenshot({path:`artifacts/pilot-provider-${kind}.png`,fullPage:true});results.push({kind,category_id:category.id,capability_keys:Object.keys(profile.pilot_capabilities||{}),reference_count:refs.length,result:'PASS'})
 }finally{await page.close()}
}
try{await testKind('faxina');await testKind('marido');await fs.writeFile('artifacts/pilot-provider-runtime.json',JSON.stringify({environment:'UGO TEST',sha,provider_id:providerId,results,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')}finally{
 await sb.from('proveedor_referencias_laborales').delete().eq('proveedor_id',providerId)
 if(originalRefs?.length)await sb.from('proveedor_referencias_laborales').insert(originalRefs.map(r=>({...r,proveedor_id:providerId})))
 await sb.from('perfiles_proveedor').update({categoria_principal_id:original.categoria_principal_id,pilot_capabilities:original.pilot_capabilities||{}}).eq('usuario_id',providerId)
 await browser.close();await sb.auth.signOut()
}
console.log(JSON.stringify({status:'PASS',sha,provider_id:providerId,results}))
