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
assert.ok(anon&&email&&password&&sha,'UGO_TEST_CLIENT_LOCATION_INPUTS_REQUIRED')

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_CLIENT_SESSION_REQUIRED')

const {data:categories,error:categoriesError}=await auth.from('categorias').select('id,nombre,slug').eq('activa',true).order('nombre')
assert.ifError(categoriesError)
assert.ok(categories?.length,'UGO_TEST_ACTIVE_CATEGORY_REQUIRED')
const category=categories[0]
const expected={latitude:-27.438,longitude:-48.477,address:'Rua das Flores 321, Canasvieiras, Florianópolis'}

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:expected.latitude,longitude:expected.longitude},permissions:['geolocation']})
const page=await context.newPage()
const pageErrors=[]
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
await page.route('https://photon.komoot.io/**',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[expected.longitude,expected.latitude]},properties:{street:'Rua das Flores',housenumber:'321',district:'Canasvieiras',city:'Florianópolis'}}]})})
})
await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)

async function openLocation(){
  await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
  await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:/Ver todas/}).first().click()
  const categoryButton=page.locator('.ugo-home-all-results button').filter({hasText:String(category.nombre)}).first()
  await categoryButton.waitFor({state:'visible',timeout:15000})
  await categoryButton.click()
  await page.getByRole('main',{name:'Qué hay que hacer'}).waitFor({state:'visible',timeout:15000})
  await page.getByRole('textbox',{name:'Descripción del trabajo'}).fill('Prueba automatizada de ubicación Cliente con detalle suficiente')
  const continueButton=page.locator('.ugo-need-screen footer button').filter({hasText:'Continuar'}).first()
  await page.waitForFunction(()=>{const button=document.querySelector('.ugo-need-screen footer button');return button instanceof HTMLButtonElement&&!button.disabled},null,{timeout:15000})
  await continueButton.click()
  await page.getByRole('main',{name:'Dónde es el servicio'}).waitFor({state:'visible',timeout:20000})
}

try{
  await openLocation()
  const map=page.getByRole('region',{name:'Mapa de ubicación del servicio'})
  await map.waitFor({state:'visible'})
  assert.ok((await map.textContent())?.includes('Ubicación pendiente'),'MAP_INITIAL_PENDING_REQUIRED')

  await page.getByRole('button',{name:/Usar mi ubicación/}).click()
  const address=page.locator('input[autocomplete="street-address"]')
  await page.waitForFunction(()=>document.querySelector('input[autocomplete="street-address"]')?.value?.includes('Rua das Flores'),null,{timeout:15000})
  assert.match(await address.inputValue(),/Rua das Flores 321/)
  assert.ok(await map.evaluate(el=>el.classList.contains('has-location')),'MAP_CONFIRMED_CLASS_REQUIRED')
  assert.ok((await map.textContent())?.includes('Ubicación confirmada'),'MAP_CONFIRMED_COPY_REQUIRED')
  const draft=await page.evaluate(uid=>JSON.parse(sessionStorage.getItem('ugo:guided-request-draft:'+uid)||'{}'),login.user.id)
  assert.equal(Number(draft.pickupLat),expected.latitude)
  assert.equal(Number(draft.pickupLng),expected.longitude)
  assert.equal(draft.pickupSource,'current')

  await address.fill('Dirección manual temporal')
  assert.ok(!(await map.evaluate(el=>el.classList.contains('has-location'))),'MANUAL_EDIT_MUST_CLEAR_CONFIRMED_PICKUP')

  await context.setGeolocation({latitude:0,longitude:0})
  await page.getByRole('button',{name:/Usar mi ubicación/}).click()
  await page.getByRole('alert').filter({hasText:/coordenadas inválidas/i}).waitFor({state:'visible',timeout:10000})
  assert.ok(!(await map.evaluate(el=>el.classList.contains('has-location'))),'INVALID_COORDS_MUST_FAIL_CLOSED')

  await context.clearPermissions()
  await page.getByRole('button',{name:/Usar mi ubicación/}).click()
  await page.getByRole('alert').filter({hasText:/permiso de ubicación/i}).waitFor({state:'visible',timeout:10000})

  await context.grantPermissions(['geolocation'])
  await page.evaluate(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_ok,error)=>error({code:3,message:'timeout'}),watchPosition:()=>0,clearWatch:()=>{}}})})
  await page.getByRole('button',{name:/Usar mi ubicación/}).click()
  await page.getByRole('alert').filter({hasText:/tardó demasiado/i}).waitFor({state:'visible',timeout:10000})

  assert.deepEqual(pageErrors,[],'runtime page errors detected')
  await page.screenshot({path:'artifacts/client-location-runtime.png',fullPage:true})
  const evidence={
    readiness_id:'client-location',
    task_id:'readiness-client-location',
    job_id:'UGO-READINESS-CLIENT-LOCATION',
    environment:'UGO TEST',
    sha,
    production_touched:false,
    physical_gps_deferred:true,
    assertions:{
      valid_geolocation_populates_form:true,
      map_reflects_confirmed_pickup:true,
      pickup_coordinates_persist_in_request_draft:true,
      manual_address_edit_clears_stale_pickup:true,
      zero_zero_rejected_fail_closed:true,
      permission_denied_message:true,
      timeout_message:true,
      no_page_errors:true
    },
    expected,
    result:'PASS',
    completed_at:new Date().toISOString()
  }
  await fs.writeFile('artifacts/client-location-runtime.json',JSON.stringify(evidence,null,2)+'\n')
  console.log(JSON.stringify({status:'PASS',sha,environment:'UGO TEST'}))
}finally{
  await context.close()
  await browser.close()
  await auth.auth.signOut()
}
