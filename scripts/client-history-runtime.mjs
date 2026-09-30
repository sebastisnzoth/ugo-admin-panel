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
assert.ok(anon&&email&&password&&sha,'UGO_TEST_CLIENT_HISTORY_INPUTS_REQUIRED')
const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user)

const {data:services,error:servicesError}=await auth.from('servicios')
 .select('id,numero,estado,tarifa,created_at,completado_at,programado_para')
 .eq('cliente_id',login.user.id)
 .order('created_at',{ascending:false}).limit(200)
assert.ifError(servicesError)
assert.ok(services?.length,'UGO_TEST_HISTORY_COMPLETED_SERVICE_REQUIRED')

let fixture=null
for(const service of services.filter(service=>service.estado==='completado')){
 const [{data:payments,error:pe},{data:ratings,error:re},{data:evidence,error:ee}]=await Promise.all([
  auth.from('pagos').select('id,estado,metodo,monto_bruto').eq('servicio_id',service.id).limit(1),
  auth.from('resenas').select('id,autor_tipo,puntuacion,comentario').eq('servicio_id',service.id),
  auth.from('evidencias_servicio').select('id,tipo,storage_path,descripcion').eq('servicio_id',service.id).limit(10)
 ])
 if(pe||re||ee)continue
 const clientRating=(ratings||[]).find(x=>x.autor_tipo==='cliente')
 const providerRating=(ratings||[]).find(x=>x.autor_tipo==='proveedor')
 if(payments?.[0]&&clientRating&&providerRating&&evidence?.[0]){
  fixture={service,payment:payments[0],clientRating,providerRating,evidence}
  break
 }
}
assert.ok(fixture,'UGO_TEST_HISTORY_FIXTURE_WITH_PAYMENT_BILATERAL_RATINGS_AND_EVIDENCE_REQUIRED')

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const context=await browser.newContext({viewport:{width:390,height:844}})
const page=await context.newPage()
const pageErrors=[]
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)

try{
 await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
 await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
 const activity=page.getByRole('button',{name:/Actividad/}).first()
 await activity.waitFor({state:'visible',timeout:15000})
 await activity.click()
 const panel=page.locator('.ugo-history-panel.ugo-client-history')
 await panel.waitFor({state:'visible',timeout:15000})
 const marker=fixture.service.numero?('#'+fixture.service.numero):String(fixture.service.id).slice(0,8)
 const row=panel.locator('.ugo-history-item').filter({hasText:marker}).first()
 await row.waitFor({state:'visible',timeout:15000})
 const text=await row.innerText()
 assert.match(text,/PAGO/)
 assert.ok(text.includes(String(fixture.payment.metodo||'pago')),'payment method missing in UI')
 assert.ok(text.includes(String(fixture.payment.estado||'')),'payment state missing in UI')
 assert.match(text,/TU CALIFICACIÓN/)
 assert.ok(text.includes(String(fixture.clientRating.puntuacion)+'/5'),'client rating missing in UI')
 assert.match(text,/CALIFICACIÓN RECIBIDA/)
 assert.ok(text.includes(String(fixture.providerRating.puntuacion)+'/5'),'provider rating missing in UI')
 const photos=row.getByRole('button',{name:'Ver fotos'})
 await photos.click()
 const gallery=row.locator('.ugo-client-history-evidence .ugo-client-evidence')
 await gallery.waitFor({state:'visible',timeout:15000})
 const images=gallery.locator('img')
 assert.ok(await images.count()>0,'authorized evidence image must render')
 const src=await images.first().getAttribute('src')
 assert.ok(src&&/^https?:/.test(src),'signed evidence URL required')
 assert.deepEqual(pageErrors,[])
 await page.screenshot({path:'artifacts/client-history-runtime.png',fullPage:true})
 const proof={
  readiness_id:'client-history',
  task_id:'readiness-client-history',
  job_id:'UGO-READINESS-CLIENT-HISTORY',
  environment:'UGO TEST',
  sha,
  service_id:fixture.service.id,
  service_number:fixture.service.numero,
  backend:{
   payment:{estado:fixture.payment.estado,metodo:fixture.payment.metodo,monto_bruto:fixture.payment.monto_bruto},
   client_rating:Number(fixture.clientRating.puntuacion),
   provider_rating:Number(fixture.providerRating.puntuacion),
   evidence_count:fixture.evidence.length
  },
  assertions:{
   completed_service_visible:true,
   payment_visible_and_concordant:true,
   client_rating_visible_and_concordant:true,
   provider_rating_visible_and_concordant:true,
   authorized_photo_visible:true,
   no_page_errors:true
  },
  result:'PASS',
  page_errors:pageErrors,
  completed_at:new Date().toISOString()
 }
 await fs.writeFile('artifacts/client-history-runtime.json',JSON.stringify(proof,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,serviceId:fixture.service.id,serviceNumber:fixture.service.numero}))
}finally{
 await context.close();await browser.close();await auth.auth.signOut()
}
