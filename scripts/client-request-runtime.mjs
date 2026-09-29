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
assert.ok(anon&&email&&password&&sha,'UGO_TEST_CLIENT_REQUEST_RUNTIME_INPUTS_REQUIRED')

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_CLIENT_SESSION_REQUIRED')

const {data:activeCategories,error:categoriesError}=await auth.from('categorias').select('id,nombre,slug,emoji').eq('activa',true).order('nombre')
assert.ifError(categoriesError)
assert.ok(activeCategories?.length,'UGO TEST requires at least one active category')
const selectedCategory=activeCategories.find(category=>/plomer|limpeza|electric|repar/i.test(String(category.slug||'')+' '+String(category.nombre||'')))||activeCategories[0]
const expected={
  category:String(selectedCategory.nombre),
  categoryId:String(selectedCategory.id),
  categorySlug:String(selectedCategory.slug||''),
  description:String(selectedCategory.nombre)+': solicitud de prueba readiness client-request con detalle suficiente',
  latitude:-27.438,
  longitude:-48.477,
  address:'Rua das Flores 321, Canasvieiras, Florianópolis',
  when:'ahora',
  payment:'efectivo'
}

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const context=await browser.newContext({
  viewport:{width:390,height:844},
  geolocation:{latitude:expected.latitude,longitude:expected.longitude},
  permissions:['geolocation'],
})
const page=await context.newPage()
const pageErrors=[]
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
await page.route('https://photon.komoot.io/**',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[expected.longitude,expected.latitude]},properties:{street:'Rua das Flores',housenumber:'321',district:'Canasvieiras',city:'Florianópolis'}}]})})
})
await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)
let serviceId=''
let requestDraftId=''
let backendRow=null
let cleanup={attempted:false,ok:false,error:null}

try{
  await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
  await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})

  const showAll=page.getByRole('button',{name:/Ver todas/}).first()
  await showAll.waitFor({state:'visible',timeout:15000})
  await showAll.click()
  const categoryButton=page.locator('.ugo-home-all-results button').filter({hasText:expected.category}).first()
  await categoryButton.waitFor({state:'visible',timeout:15000})
  assert.equal(await categoryButton.isDisabled(),false,expected.category+' active category unavailable in TEST UI')
  await categoryButton.click()

  await page.getByRole('main',{name:'Qué hay que hacer'}).waitFor({state:'visible',timeout:15000})
  const description=page.getByRole('textbox',{name:'Descripción del trabajo'})
  await description.fill(expected.description)
  const needContinue=page.locator('.ugo-need-screen footer button').filter({hasText:'Continuar'}).first()
  await needContinue.waitFor({state:'visible',timeout:15000})
  await page.waitForFunction(()=>{const button=document.querySelector('.ugo-need-screen footer button');return button instanceof HTMLButtonElement&&!button.disabled},null,{timeout:20000})
  await needContinue.click()
  try{
    await page.getByRole('main',{name:'Dónde es el servicio'}).waitFor({state:'visible',timeout:20000})
  }catch(error){
    const alert=await page.getByRole('alert').first().textContent().catch(()=>null)
    const screen=await page.locator('.ugo-need-screen').innerText().catch(()=>null)
    throw new Error('Client request did not advance from need to location. alert='+String(alert)+' screen='+String(screen),{cause:error})
  }
  await page.getByRole('button',{name:/Usar mi ubicación/}).click()
  const addressInput=page.locator('input[autocomplete="street-address"]')
  await addressInput.waitFor({state:'visible',timeout:10000})
  await page.waitForFunction(()=>document.querySelector('input[autocomplete="street-address"]')?.value?.includes('Rua das Flores'),null,{timeout:15000})
  assert.match(await addressInput.inputValue(),/Rua das Flores 321/)
  await page.getByRole('button',{name:/Continuar/}).click()

  await page.getByRole('main',{name:'Cuándo lo necesitás'}).waitFor({state:'visible',timeout:15000})
  await page.getByRole('button',{name:/Lo antes posible/}).click()
  await page.getByRole('button',{name:/Continuar/}).click()

  await page.getByRole('heading',{name:'¿Cómo vas a pagar?'}).waitFor({state:'visible',timeout:15000})
  await page.getByRole('button',{name:/Efectivo/}).click()
  await page.getByRole('button',{name:/Continuar/}).click()

  await page.getByRole('heading',{name:'Resumen del pedido'}).waitFor({state:'visible',timeout:15000})
  const summary=await page.locator('.ugo-summary-screen').innerText()
  assert.ok(summary.includes(expected.category),'category missing from summary')
  assert.ok(summary.includes(expected.description),'description missing from summary')
  assert.match(summary,/Rua das Flores 321/i)
  assert.match(summary,/Lo antes posible/i)
  assert.match(summary,/Efectivo/i)

  requestDraftId=await page.evaluate(uid=>sessionStorage.getItem('ugo:guided-request:'+uid)||'',login.user.id)
  assert.ok(requestDraftId,'request draft id required before confirm')
  await page.getByRole('button',{name:/Confirmar y buscar profesional/}).click()
  await page.locator('.ugo-matching-screen, .ugo-assigned-screen').first().waitFor({state:'visible',timeout:20000})
  await page.waitForFunction(()=>{
    if(document.querySelector('.ugo-assigned-screen'))return true
    const cancel=document.querySelector('.ugo-matching-screen button.cancel')
    return cancel instanceof HTMLButtonElement&&!cancel.disabled
  },null,{timeout:30000})

  const {data:rows,error:rowError}=await auth.from('servicios')
    .select('id,cliente_id,categoria_id,estado,descripcion,direccion_cliente,zona,tarifa,urgencia,metadata,ubicacion_cliente,created_at')
    .eq('cliente_id',login.user.id)
    .eq('metadata->>request_draft_id',requestDraftId)
    .order('created_at',{ascending:false})
    .limit(2)
  assert.ifError(rowError)
  assert.equal(rows?.length,1,'idempotency requires exactly one service for request_draft_id')
  backendRow=rows[0]
  serviceId=String(backendRow.id||'')
  assert.ok(serviceId,'serviceId TEST required')

  const {data:cat,error:catError}=await auth.from('categorias').select('id,nombre,slug').eq('id',backendRow.categoria_id).single()
  assert.ifError(catError)
  assert.equal(String(cat?.id),expected.categoryId,'persisted category id mismatch')
  assert.equal(cat?.nombre,expected.category,'persisted category mismatch')
  assert.equal(backendRow.descripcion,expected.description,'persisted description mismatch')
  assert.match(String(backendRow.direccion_cliente||''),/Rua das Flores 321/)
  assert.equal(Boolean(backendRow.urgencia),true,'immediate request must persist urgency')
  assert.equal(backendRow.metadata?.requested_when,expected.when)
  assert.equal(backendRow.metadata?.payment_method,expected.payment)
  assert.equal(backendRow.metadata?.pickup_source,'current')
  assert.equal(backendRow.metadata?.request_draft_id,requestDraftId)
  assert.ok(backendRow.ubicacion_cliente,'pickup location must be persisted on service before matching')
  assert.ok(['buscando','ofrecido','asignado','confirmado','en_camino','llegado','en_progreso'].includes(String(backendRow.estado)),'request was not submitted into an operational state')
  assert.deepEqual(pageErrors,[],'runtime page errors detected')

  await page.screenshot({path:'artifacts/client-request-runtime.png',fullPage:true})
  const evidence={
    readiness_id:'client-request',
    task_id:'readiness-client-request',
    job_id:'UGO-READINESS-CLIENT-REQUEST',
    correlation_id:'readiness-client-request-20260929T231430Z-f1fa5a58',
    environment:'UGO TEST',
    sha,
    service_id:serviceId,
    request_draft_id:requestDraftId,
    ui:{category:expected.category,category_id:expected.categoryId,category_slug:expected.categorySlug,description:expected.description,address:expected.address,when:'Lo antes posible',payment:'Efectivo'},
    backend:{
      id:backendRow.id,
      cliente_id:backendRow.cliente_id,
      categoria_id:backendRow.categoria_id,
      categoria_nombre:cat.nombre,
      categoria_slug:cat.slug,
      estado:backendRow.estado,
      descripcion:backendRow.descripcion,
      direccion_cliente:backendRow.direccion_cliente,
      zona:backendRow.zona,
      tarifa:backendRow.tarifa,
      urgencia:backendRow.urgencia,
      metadata:backendRow.metadata,
      ubicacion_cliente:String(backendRow.ubicacion_cliente),
      created_at:backendRow.created_at
    },
    assertions:{
      category_persisted:true,
      description_persisted:true,
      location_persisted:true,
      conditions_persisted:true,
      payment_persisted:true,
      idempotent_single_service:true,
      submitted_operational_state:true,
      no_page_errors:true
    },
    page_errors:pageErrors,
    result:'PASS',
    completed_at:new Date().toISOString()
  }
  await fs.writeFile('artifacts/client-request-runtime.json',JSON.stringify(evidence,null,2)+'\n')

  cleanup.attempted=true
  const {error:cancelError}=await auth.rpc('cancelar_servicio',{p_servicio_id:serviceId})
  cleanup.ok=!cancelError
  cleanup.error=cancelError?String(cancelError.message||cancelError):null
  await fs.writeFile('artifacts/client-request-cleanup.json',JSON.stringify({service_id:serviceId,...cleanup,at:new Date().toISOString()},null,2)+'\n')
  console.log(JSON.stringify({status:'PASS',sha,serviceId,requestDraftId,backendState:backendRow.estado,cleanup}))
}finally{
  await context.close()
  await browser.close()
  await auth.auth.signOut()
}
