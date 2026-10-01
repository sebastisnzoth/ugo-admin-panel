import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
import{chromium}from'playwright'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(serviceKey&&sha,'HUGO_PROVIDER_ACTIONS_RUNTIME_INPUTS_REQUIRED')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now(),password='UGO-Test-'+token+'-A9!'
const pe=`ugo-hugo-provider-${token}@example.test`,ce=`ugo-hugo-client-${token}@example.test`
let providerId=null,clientId=null,serviceId=null,browser=null
async function cleanup(){if(serviceId){await admin.from('pagos').delete().eq('servicio_id',serviceId);await admin.from('ofertas_servicio').delete().eq('servicio_id',serviceId);await admin.from('servicios').delete().eq('id',serviceId)}for(const id of[providerId,clientId]){if(!id)continue;await admin.from('notificaciones').delete().eq('usuario_id',id);await admin.from('perfiles_proveedor').delete().eq('usuario_id',id);await admin.from('usuarios').delete().eq('id',id);await admin.auth.admin.deleteUser(id)}if(browser)await browser.close()}
try{
 const p=await admin.auth.admin.createUser({email:pe,password,email_confirm:true,user_metadata:{nombre:'UGO Hugo Provider Runtime',tipo:'proveedor'}});if(p.error)throw p.error;providerId=p.data.user.id
 const c=await admin.auth.admin.createUser({email:ce,password,email_confirm:true,user_metadata:{nombre:'UGO Hugo Client Runtime',tipo:'cliente'}});if(c.error)throw c.error;clientId=c.data.user.id
 const prep=await admin.rpc('autonomous_qa_prepare_provider_active_job',{p_provider_id:providerId,p_client_id:clientId});assert.ifError(prep.error);serviceId=prep.data.service_id;assert.equal(prep.data.state,'asignado')
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:-25.4284,longitude:-49.2733,accuracy:12}});const page=await context.newPage()
 await page.addInitScript(()=>{window.__ugoToolResponses=[];window.UGOVoiceBridge={isAvailable:()=>true,startListening:async()=>{},stopListening:()=>{},stopSpeaking:()=>{},sendToolResponse:(id,name,response)=>{window.__ugoToolResponses.push({id,name,response});return true}}})
 const call=async(name,args={})=>{const id='provider-'+Math.random().toString(36).slice(2);await page.evaluate(({id,name,args})=>window.dispatchEvent(new CustomEvent('ugo:native-voice-tool-call',{detail:{id,name,args}})),{id,name,args});await page.waitForFunction(id=>Array.isArray(window.__ugoToolResponses)&&window.__ugoToolResponses.some(item=>item.id===id),id,{timeout:20000});const response=await page.evaluate(id=>window.__ugoToolResponses.find(item=>item.id===id)?.response,id);await page.waitForTimeout(350);return response}
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'});await page.getByPlaceholder('tu@email.com').fill(pe);await page.getByPlaceholder('Mínimo 6 caracteres').fill(password);await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.getByText('TRABAJO ACTIVO').waitFor({state:'visible',timeout:30000});await page.getByRole('button',{name:'Continuar trabajo'}).waitFor({state:'visible',timeout:20000});await page.getByRole('button',{name:'Hablar con Hugo'}).click();await page.getByText('HUGO · PROVEEDOR').waitFor({state:'visible',timeout:10000});await page.waitForTimeout(300)
 const active=await call('provider_get_active_service');assert.equal(active.ok,true);assert.equal(active.data.service.serviceId,serviceId);assert.equal(active.data.service.state,'asignado')
 const noConfirm=await call('provider_update_service_status',{service_id:serviceId,status:'en_camino',confirmed:false});assert.equal(noConfirm.ok,false);assert.equal(noConfirm.code,'CONFIRMATION_REQUIRED')
 const offline=await call('provider_set_offline',{confirmed:true});assert.equal(offline.ok,true);assert.equal(offline.data.online,false);await page.locator('.provider-operational-chip.is-offline').first().waitFor({state:'visible',timeout:10000});await page.waitForTimeout(250)
 const online=await call('provider_set_online',{confirmed:true});assert.equal(online.ok,true);assert.equal(online.data.online,true);await page.locator('.provider-operational-chip.is-online').first().waitFor({state:'visible',timeout:10000});await page.waitForTimeout(250)
 const going=await call('provider_update_service_status',{service_id:serviceId,status:'en_camino',confirmed:true});assert.equal(going.ok,true);assert.equal(going.data.status,'en_camino')
 const row=await admin.from('servicios').select('estado').eq('id',serviceId).single();assert.ifError(row.error);assert.equal(row.data.estado,'en_camino')
 const invalid=await call('provider_update_service_status',{service_id:serviceId,status:'en_progreso',confirmed:true});assert.equal(invalid.ok,false);assert.equal(invalid.code,'INVALID_TRANSITION')
 const profile=await admin.from('perfiles_proveedor').select('online,disponible').eq('usuario_id',providerId).single();assert.ifError(profile.error);assert.equal(profile.data.disponible,true)
 const evidence={readiness_id:'hugo-provider-actions',sha,environment:'UGO TEST',production_touched:false,service_id:serviceId,active_service_resolved:true,confirmation_guard:true,offline_tool:true,online_tool:true,en_camino_persisted:true,invalid_transition_blocked:true,arrival_gps_physical_pending:true,microphone_audio_pending:true,result:'PASS',completed_at:new Date().toISOString()}
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/hugo-provider-actions-runtime.json',JSON.stringify(evidence,null,2)+'\n');await page.screenshot({path:'artifacts/hugo-provider-actions-runtime.png',fullPage:true});console.log(JSON.stringify(evidence))
}finally{await cleanup()}
