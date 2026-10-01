import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',adminEmail=process.env.UGO_TEST_ADMIN_EMAIL||'',adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&serviceRole&&adminEmail&&adminPassword&&sha,'HUGO_CLIENT_ORDER_RUNTIME_INPUTS_REQUIRED')
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}}),adminUser=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now(),email=`ugo-hugo-order-${token}@example.test`,password='UGO-Test-'+token+'-A9!'
let userId=null,placeId=null,serviceId=null,browser=null,page=null
async function cleanup(){if(page)await page.evaluate(()=>{try{sessionStorage.clear()}catch{}}).catch(()=>{});if(browser)await browser.close();if(serviceId){await admin.from('notificaciones').delete().contains('datos',{servicio_id:serviceId});await admin.from('ofertas_servicio').delete().eq('servicio_id',serviceId);await admin.from('servicio_estado_eventos').delete().eq('servicio_id',serviceId);await admin.from('pagos').delete().eq('servicio_id',serviceId);await admin.from('servicios').delete().eq('id',serviceId)}if(placeId)await admin.from('direcciones_cliente').delete().eq('id',placeId);if(userId){await admin.from('usuarios').delete().eq('id',userId);await admin.auth.admin.deleteUser(userId)}}
try{
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:'UGO Hugo Voice Order',tipo:'cliente'}});if(created.error)throw created.error;userId=created.data.user.id
 let q=await admin.from('usuarios').upsert({id:userId,nombre:'UGO Hugo Voice Order',tipo:'cliente',activo:true,es_demo:true},{onConflict:'id'});if(q.error)throw q.error
 const place=await admin.from('direcciones_cliente').insert({usuario_id:userId,etiqueta:'Casa',direccion:'Rua UGO VOZ 100',barrio:'Centro',ciudad:'Florianópolis',latitud:-27.5949,longitud:-48.5482,es_predeterminada:false}).select('id').single();if(place.error)throw place.error;placeId=place.data.id
 const adminLogin=await adminUser.auth.signInWithPassword({email:adminEmail,password:adminPassword});assert.ifError(adminLogin.error);assert.ok(adminLogin.data.session)
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage()
 await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
 await page.getByPlaceholder('tu@email.com').fill(email)
 await page.getByPlaceholder('Mínimo 6 caracteres').fill(password)
 await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:30000});await page.getByRole('button',{name:'Hablar con Hugo'}).waitFor({state:'visible',timeout:20000})
 await page.evaluate(()=>{window.__ugoToolResponses=[];window.__ugoPhotoStep=0;window.addEventListener('ugo:client:request-photo',()=>{window.__ugoPhotoStep++});window.UGOVoiceBridge={isAvailable:()=>true,startListening:()=>{},stopListening:()=>{},stopSpeaking:()=>{},sendToolResponse:(id,name,response)=>{window.__ugoToolResponses.push({id,name,response});return true}}})
 const call=async(name,args={})=>{const id='voice-'+Math.random().toString(36).slice(2);await page.evaluate(({id,name,args})=>window.dispatchEvent(new CustomEvent('ugo:native-voice-tool-call',{detail:{id,name,args}})),{id,name,args});await page.waitForFunction(id=>window.__ugoToolResponses?.some(x=>x.id===id),id,{timeout:25000});return await page.evaluate(id=>window.__ugoToolResponses.find(x=>x.id===id)?.response,id)}
 assert.equal((await call('set_request_category',{category:'plomero'})).ok,true)
 assert.equal((await call('set_request_description',{description:'La canilla de la cocina pierde agua'})).ok,true)
 assert.equal((await call('use_saved_place',{label:'Casa'})).ok,true)
 assert.equal((await call('open_request_photo')).ok,true);assert.equal(await page.evaluate(()=>window.__ugoPhotoStep),1)
 assert.equal((await call('set_schedule',{when:'ahora'})).ok,true)
 assert.equal((await call('set_payment_method',{method:'cash'})).ok,true)
 const draft=await call('get_request_draft');assert.equal(draft.ok,true);assert.equal(draft.data.readyForConfirmation,true)
 const createdOrder=await call('create_service_request',{confirmed:true});assert.equal(createdOrder.ok,true);serviceId=String(createdOrder.data?.serviceId||'');assert.ok(serviceId)
 const backend=await admin.from('servicios').select('id,cliente_id,estado,descripcion,direccion_cliente,metadata,categoria_id,proveedor_id').eq('id',serviceId).single();assert.ifError(backend.error);assert.equal(backend.data.cliente_id,userId);assert.equal(backend.data.descripcion,'La canilla de la cocina pierde agua');assert.equal(backend.data.direccion_cliente,'Rua UGO VOZ 100');assert.equal(backend.data.metadata?.source,'hugo-conversational');assert.equal(backend.data.metadata?.voice,true);assert.equal(backend.data.metadata?.payment_method,'efectivo')
 const clientList=await call('client_list_services');assert.equal(clientList.ok,true);assert.ok(clientList.data.services.some(s=>String(s.serviceId)===serviceId),'CLIENT_SERVICE_NOT_VISIBLE')
 const adminView=await adminUser.from('servicios').select('id,estado,cliente_id,metadata').eq('id',serviceId).maybeSingle();assert.ifError(adminView.error);assert.equal(adminView.data?.id,serviceId);assert.equal(adminView.data?.cliente_id,userId)
 const evidence={readiness_id:'hugo-client-order-by-voice',sha,environment:'UGO TEST',production_touched:false,tool_calls:['set_request_category','set_request_description','use_saved_place','open_request_photo','set_schedule','set_payment_method','get_request_draft','create_service_request','client_list_services'],photo_step_opened:true,service_id:serviceId,client_visible:true,admin_role_visible:true,backend_visible:true,payment_method:'efectivo',source:'hugo-conversational',voice_metadata:true,automated_voice_tool_path:true,human_audio_required:true,result:'PASS',completed_at:new Date().toISOString()}
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/hugo-client-order-by-voice-runtime.json',JSON.stringify(evidence,null,2)+'\n');await page.screenshot({path:'artifacts/hugo-client-order-by-voice-runtime.png',fullPage:true});console.log(JSON.stringify(evidence))
}finally{await cleanup()}
