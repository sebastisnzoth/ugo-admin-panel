import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
import{chromium}from'playwright'
import{execFile}from'node:child_process'
import{promisify}from'node:util'
const execFileAsync=promisify(execFile)

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
const sha=process.env.UGO_RUNTIME_SHA||'unknown'
assert.ok(url&&anon&&serviceKey,'UGO TEST credentials required')
assert.match(url,/tmossnqfwfwjrtzwcbmm/,'Refusing non-TEST Supabase project')

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,10)+'-'+Date.now()
const email=`ugo-provider-alert-${token}@example.test`
const password='UGO-Test-'+token+'-A9!'
let uid=null,noticeId=null,browser=null
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'provider-alerts',sha,environment:'UGO TEST',provider_id:null,notification_id:null,realtime:{banner:false},attention:{tone:false,vibrate:false},production_touched:false,offer_origin:'DIRECT_NOTIFICATION_PROBE',physical_gps_verified:false,physical_audio_verified:false,physical_vibration_verified:false,result:'FAIL'}

async function checkedCleanup(query){const {error}=await query;if(error)throw error}
async function cleanup(){
 if(browser){await browser.close();browser=null}
 if(uid){
  await checkedCleanup(admin.from('notificaciones').delete().eq('usuario_id',uid))
  await checkedCleanup(admin.from('perfiles_proveedor').delete().eq('usuario_id',uid))
  await checkedCleanup(admin.from('usuarios').delete().eq('id',uid))
  await checkedCleanup(admin.auth.admin.deleteUser(uid))
 }
}
try{
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:'UGO Alert Runtime',tipo:'proveedor'}})
 if(created.error)throw created.error
 uid=created.data.user.id
 evidence.provider_id=uid
 let q=await admin.from('usuarios').upsert({id:uid,nombre:'UGO Alert Runtime',tipo:'proveedor',activo:true},{onConflict:'id'})
 if(q.error)throw q.error
 const category=await admin.from('categorias').select('id').eq('activa',true).limit(1).single()
 if(category.error)throw category.error
 q=await admin.from('perfiles_proveedor').upsert({usuario_id:uid,estado_verificacion:'verificado',online:true,disponible:true,onboarding_completo_at:new Date().toISOString(),termos_aceitos_at:new Date().toISOString(),termos_versao:'2026-09-04',categoria_principal_id:category.data.id,tarifa_base:100},{onConflict:'usuario_id'})
 if(q.error)throw q.error

 browser=await chromium.launch({headless:true})
 // Synthetic TEST browser location; preserve the product's permission guard.
 const context=await browser.newContext({permissions:['geolocation'],geolocation:{latitude:-27.438,longitude:-48.477,accuracy:10}})
 const page=await context.newPage()
 await page.addInitScript(()=>{
  window.__ugoToneCount=0;window.__ugoVibrateCount=0
  const makeParam=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}})
  class FakeAudioContext{
   constructor(){this.state='running';this.currentTime=0;this.destination={}}
   createOscillator(){return{type:'sine',frequency:makeParam(),connect(){},start(){window.__ugoToneCount++},stop(){}}}
   createGain(){return{gain:makeParam(),connect(){}}}
   resume(){this.state='running';return Promise.resolve()}
  }
  window.AudioContext=FakeAudioContext
  navigator.vibrate=()=>{window.__ugoVibrateCount++;return true}
 })
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
 await page.getByPlaceholder('tu@email.com').fill(email)
 await page.getByPlaceholder('Mínimo 6 caracteres').fill(password)
 await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.getByRole('button',{name:/Notificaciones UGO/}).waitFor({state:'visible',timeout:30000})
 // Let auth/profile loads settle and the notifications realtime channel subscribe.
 await page.waitForTimeout(1800)

 const expiresAt=new Date(Date.now()+5*60_000).toISOString()
 const inserted=await admin.from('notificaciones').insert({
  usuario_id:uid,
  tipo:'nueva_oferta',
  titulo:'Nuevo servicio en tu zona',
  cuerpo:'Hay un servicio disponible para revisar ahora.',
  datos:{expira_at:expiresAt,role:'provider',runtime_probe:true},
  dedupe_key:`readiness-provider-alerts:${token}`
 }).select('id').single()
 if(inserted.error)throw inserted.error
 noticeId=inserted.data.id
 evidence.notification_id=noticeId

 const live=page.locator('.ugo-notification-live')
 await live.waitFor({state:'visible',timeout:15000})
 await assert.doesNotReject(()=>live.getByText('UGO · NUEVO PEDIDO').waitFor({state:'visible',timeout:3000}))
 await assert.doesNotReject(()=>live.getByText('Nuevo servicio en tu zona').waitFor({state:'visible',timeout:3000}))
 evidence.realtime.banner=true
 const attention=await page.evaluate(()=>({tone:Number(window.__ugoToneCount||0),vibrate:Number(window.__ugoVibrateCount||0)}))
 evidence.attention.tone=attention.tone>0
 evidence.attention.vibrate=attention.vibrate>0
 assert.equal(evidence.attention.tone,true,'PROVIDER_TONE_NOT_EMITTED')
 assert.equal(evidence.attention.vibrate,true,'PROVIDER_VIBRATION_NOT_EMITTED')

 evidence.result='PASS'
 await mkdir('artifacts',{recursive:true})
 await writeFile('artifacts/provider-alerts-runtime.json',JSON.stringify(evidence,null,2)+'\n')
 await page.screenshot({path:'artifacts/provider-alerts-runtime.png',fullPage:true})
 const judge=await execFileAsync(process.execPath,['scripts/provider-alerts-persistence-judge.mjs'],{env:process.env});console.log(judge.stdout)
 console.log(JSON.stringify({status:'PASS',sha,provider_id:uid,notification_id:noticeId,tone:true,vibrate:true,realtime_banner:true}))
}finally{
 await cleanup()
}
