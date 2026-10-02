import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',email=process.env.UGO_TEST_CLIENT_EMAIL||'',password=process.env.UGO_TEST_CLIENT_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&email&&password&&sha,'PILOT_RUNTIME_INPUTS_REQUIRED')
const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await sb.auth.signInWithPassword({email,password});assert.ifError(loginError);assert.ok(login.session&&login.user)
const{data:cats,error:catError}=await sb.from('categorias').select('id,nombre,slug').in('slug',['faxina','marido-de-aluguel']).eq('activa',true);assert.ifError(catError);assert.equal(cats?.length,2)
await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true}),results=[]
const localFuture=(hours)=>{const d=new Date(Date.now()+hours*3600000),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
async function run(kind){
 const category=cats.find(c=>c.slug===(kind==='faxina'?'faxina':'marido-de-aluguel'));assert.ok(category)
 const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:-27.438,longitude:-48.477},permissions:['geolocation']})
 const page=await context.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)))
 await page.route('https://photon.komoot.io/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[-48.477,-27.438]},properties:{street:'Rua das Flores',housenumber:'321',district:'Canasvieiras',city:'Florianópolis'}}]})}))
 await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)
 let serviceId='',draftId=''
 try{
  await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'});await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
  const pendingRating=page.getByRole('button',{name:'Calificar más tarde'});if(await pendingRating.count()&&await pendingRating.isVisible())await pendingRating.click()
  await page.getByRole('button',{name:/Ver todas/}).first().click();const cat=page.locator('.ugo-home-all-results button').filter({hasText:category.nombre}).first();await cat.waitFor({state:'visible'});await cat.click()
  await page.getByRole('main',{name:'Qué hay que hacer'}).waitFor({state:'visible'});await page.getByRole('textbox',{name:'Descripción del trabajo'}).fill(kind==='faxina'?'Faxina piloto completa en apartamento con cocina y baños.':'Instalar dos estantes livianos en la sala con fijaciones adecuadas.')
  if(kind==='faxina'){await page.getByLabel('Tipo de faxina').selectOption({label:'Profunda'});await page.getByLabel('Tipo de inmueble').fill('Apartamento');await page.getByLabel('Dormitorios').fill('2');await page.getByLabel('Baños').fill('2');await page.getByLabel('m² aprox.').fill('75');await page.getByLabel('Mascotas').selectOption({label:'Sí · gato'});await page.getByLabel('Escaleras / acceso').selectOption({label:'Ascensor'});await page.getByLabel('Productos de limpieza').selectOption({label:'Profesional'});await page.getByLabel('Equipamiento').selectOption({label:'Profesional'})}
  else{await page.getByLabel('Tarea concreta').fill('Instalar estantes');await page.getByLabel('Cantidad').fill('2');await page.getByLabel('Ambiente').fill('Sala');await page.getByLabel('Materiales / repuestos').selectOption({label:'Ya los tengo'});await page.getByLabel('Altura aproximada').selectOption({label:'Hasta 2 m'})}
  const next=page.locator('.ugo-need-screen footer button').filter({hasText:'Continuar'}).first();await page.waitForFunction(()=>{const b=document.querySelector('.ugo-need-screen footer button');return b instanceof HTMLButtonElement&&!b.disabled},{timeout:5000});assert.equal(await next.isDisabled(),false);await next.click()
  await page.getByRole('main',{name:'Dónde es el servicio'}).waitFor({state:'visible'});await page.getByRole('button',{name:/Usar mi ubicación/}).click();await page.waitForFunction(()=>document.querySelector('input[autocomplete="street-address"]')?.value?.includes('Rua das Flores'));await page.getByRole('button',{name:/Continuar/}).click()
  await page.getByRole('main',{name:'Cuándo lo necesitás'}).waitFor({state:'visible'});await page.getByRole('button',{name:/Elegir fecha y hora/}).click();await page.getByLabel('Desde').fill(localFuture(4));await page.getByLabel('Hasta').fill(localFuture(7));await page.getByRole('button',{name:/Continuar/}).click()
  await page.getByRole('heading',{name:'¿Cómo vas a pagar?'}).waitFor({state:'visible'});await page.getByRole('button',{name:/Efectivo/}).click();await page.getByRole('button',{name:/Continuar/}).click()
  await page.getByRole('heading',{name:'Resumen del pedido'}).waitFor({state:'visible'});draftId=await page.evaluate(uid=>sessionStorage.getItem('ugo:guided-request:'+uid)||'',login.user.id);assert.ok(draftId);await page.getByRole('button',{name:/Confirmar y buscar profesional/}).click();await page.locator('.ugo-matching-screen, .ugo-assigned-screen').first().waitFor({state:'visible',timeout:25000})
  const{data:rows,error}=await sb.from('servicios').select('id,categoria_id,estado,metadata,programado_para').eq('cliente_id',login.user.id).eq('metadata->>request_draft_id',draftId).order('created_at',{ascending:false}).limit(2);assert.ifError(error);if(rows?.length!==1){const uiMessage=(await page.locator('.ugo-match-message').allTextContents()).join(' | ');throw new Error(`PILOT_CLIENT_SERVICE_NOT_PERSISTED kind=${kind} draft=${draftId} ui=${uiMessage}`)}
  const row=rows[0];serviceId=String(row.id);assert.equal(String(row.categoria_id),String(category.id));assert.equal(row.metadata?.pilot_kind,kind);assert.ok(row.metadata?.pilot_details);assert.ok(row.metadata?.scheduled_end_at);assert.ok(row.programado_para)
  if(kind==='faxina')for(const k of ['serviceType','propertyType','bedrooms','bathrooms','sizeM2','pets','stairs','productsBy','equipmentBy'])assert.ok(row.metadata.pilot_details[k])
  else for(const k of ['serviceType','itemCount','room','materials','height'])assert.ok(row.metadata.pilot_details[k])
  assert.deepEqual(pageErrors,[]);await page.screenshot({path:`artifacts/pilot-client-${kind}.png`,fullPage:true});results.push({kind,service_id:serviceId,state:row.estado,programado_para:row.programado_para,scheduled_end_at:row.metadata.scheduled_end_at,pilot_details:row.metadata.pilot_details,result:'PASS'})
 }finally{if(serviceId){try{await sb.rpc('cancelar_servicio',{p_servicio_id:serviceId})}catch{}}await context.close()}
}
try{await run('faxina');await run('marido');await fs.writeFile('artifacts/pilot-client-runtime.json',JSON.stringify({environment:'UGO TEST',sha,results,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({status:'PASS',sha,services:results.map(x=>x.service_id)}))}finally{await browser.close();await sb.auth.signOut()}
