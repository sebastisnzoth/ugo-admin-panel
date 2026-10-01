import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',email=process.env.UGO_TEST_CLIENT_EMAIL||'',password=process.env.UGO_TEST_CLIENT_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&serviceRole&&email&&password&&sha,'HUGO_REQUEST_CONTINUITY_INPUTS_REQUIRED')
const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await client.auth.signInWithPassword({email,password});assert.ifError(loginError);assert.ok(login.session&&login.user?.id)
const userId=login.user.id
const fixture=await admin.from('direcciones_cliente').insert({usuario_id:userId,etiqueta:'Casa',direccion:'Rua UGO TEST 100',barrio:'Centro',ciudad:'Florianópolis',latitud:-27.5949,longitud:-48.5482,es_predeterminada:false}).select('id').single();assert.ifError(fixture.error);assert.ok(fixture.data?.id)
const browser=await chromium.launch({headless:true})
let page
try{
 const context=await browser.newContext({viewport:{width:390,height:844}})
 page=await context.newPage()
 await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)
 const install=async()=>{await page.evaluate(()=>{window.__ugoToolResponses=[];window.UGOVoiceBridge={isAvailable:()=>true,startListening:()=>{},stopListening:()=>{},stopSpeaking:()=>{},sendToolResponse:(id,name,response)=>{window.__ugoToolResponses.push({id,name,response});return true}}})}
 const call=async(name,args={})=>{const id='rt-'+Math.random().toString(36).slice(2);await page.evaluate(({id,name,args})=>window.dispatchEvent(new CustomEvent('ugo:native-voice-tool-call',{detail:{id,name,args}})),{id,name,args});await page.waitForFunction(id=>Array.isArray(window.__ugoToolResponses)&&window.__ugoToolResponses.some(item=>item.id===id),id,{timeout:20000});return await page.evaluate(id=>window.__ugoToolResponses.find(item=>item.id===id)?.response,id)}
 await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
 await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
 await page.waitForTimeout(500);await install()
 assert.equal((await call('set_request_category',{category:'plomero'})).ok,true)
 assert.equal((await call('set_request_description',{description:'La canilla de la cocina pierde agua'})).ok,true)
 assert.equal((await call('use_saved_place',{label:'Casa'})).ok,true)
 assert.equal((await call('set_schedule',{when:'mañana a las 10'})).ok,true)
 assert.equal((await call('set_payment_method',{method:'pix'})).ok,true)
 const before=await call('get_request_draft')
 assert.equal(before.ok,true);assert.equal(before.data.exists,true);assert.equal(before.data.readyForConfirmation,true);assert.equal(before.data.missing,null);assert.equal(before.data.description,'La canilla de la cocina pierde agua');assert.equal(before.data.address,'Rua UGO TEST 100');assert.equal(before.data.addressLabel,'Casa');assert.equal(before.data.paymentMethod,'pix');assert.ok(before.data.category?.id);assert.ok(before.data.requestDraftId)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
 await page.waitForTimeout(700);await install()
 const after=await call('get_request_draft')
 assert.equal(after.ok,true);assert.equal(after.data.exists,true);assert.equal(after.data.readyForConfirmation,true);assert.equal(after.data.missing,null);assert.equal(after.data.category.id,before.data.category.id);assert.equal(after.data.description,before.data.description);assert.equal(after.data.address,before.data.address);assert.equal(after.data.addressLabel,before.data.addressLabel);assert.equal(after.data.when,before.data.when);assert.equal(after.data.scheduleAt,before.data.scheduleAt);assert.equal(after.data.paymentMethod,before.data.paymentMethod);assert.equal(after.data.requestDraftId,before.data.requestDraftId)
 await fs.mkdir('artifacts',{recursive:true})
 await fs.writeFile('artifacts/hugo-request-continuity-runtime.json',JSON.stringify({readiness_id:'hugo-conversation-continuity',sha,environment:'UGO TEST',production_touched:false,category_id:after.data.category.id,description:after.data.description,address:after.data.address,address_label:after.data.addressLabel,when:after.data.when,schedule_at:after.data.scheduleAt,payment_method:after.data.paymentMethod,request_draft_id:after.data.requestDraftId,ready_for_confirmation:after.data.readyForConfirmation,missing:after.data.missing,reload_preserved:true,result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
 }finally{
  if(page)await page.evaluate(()=>{try{sessionStorage.clear()}catch{}}).catch(()=>{})
  await browser.close()
  await admin.from('direcciones_cliente').delete().eq('id',fixture.data.id)
 }
console.log(JSON.stringify({status:'PASS',sha,reload_preserved:true}))
