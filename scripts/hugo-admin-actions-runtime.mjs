import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',email=process.env.UGO_TEST_ADMIN_EMAIL||'',password=process.env.UGO_TEST_ADMIN_PASSWORD||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&serviceKey&&email&&password&&sha,'HUGO_ADMIN_ACTIONS_INPUTS_REQUIRED')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}),user=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await user.auth.signInWithPassword({email,password});assert.ifError(loginError);assert.ok(login.session&&login.user)
const profile=await admin.from('usuarios').select('id,nombre,email,tipo,activo').eq('id',login.user.id).single();assert.ifError(profile.error);assert.ok(['admin','superadmin'].includes(profile.data.tipo));assert.equal(profile.data.activo,true)
const svc=await admin.from('servicios').select('id,numero,estado').order('created_at',{ascending:false}).limit(1).maybeSingle();assert.ifError(svc.error);assert.ok(svc.data?.id,'TEST_SERVICE_REQUIRED')
const beforeState=svc.data.estado
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}})
try{
 await page.addInitScript(session=>{localStorage.setItem('ugo-test-admin-auth',JSON.stringify(session));window.__ugoToolResponses=[];window.__ugoAdminActions=[];window.UGOVoiceBridge={isAvailable:()=>true,startListening:async()=>{},stopListening:()=>{},stopSpeaking:()=>{},sendToolResponse:(id,name,response)=>{window.__ugoToolResponses.push({id,name,response});return true}};window.addEventListener('ugo:admin:hugo-action',e=>window.__ugoAdminActions.push(e.detail||{}))},login.session)
 const call=async(name,args={})=>{const id='admin-'+Math.random().toString(36).slice(2);await page.evaluate(({id,name,args})=>window.dispatchEvent(new CustomEvent('ugo:native-voice-tool-call',{detail:{id,name,args}})),{id,name,args});await page.waitForFunction(id=>Array.isArray(window.__ugoToolResponses)&&window.__ugoToolResponses.some(item=>item.id===id),id,{timeout:20000});return await page.evaluate(id=>window.__ugoToolResponses.find(item=>item.id===id)?.response,id)}
 await page.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'});await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:30000})
 const open=page.getByRole('button',{name:/Abrir Hugo/i});await open.waitFor({state:'visible',timeout:20000});await open.click();await page.getByText(/HUGO/).first().waitFor({state:'visible',timeout:10000});await page.waitForTimeout(300)
 const summary=await call('admin_get_operational_summary');assert.equal(summary.ok,true);assert.ok(summary.data&&typeof summary.data==='object')
 const service=await call('admin_find_service',{service_id:svc.data.id});assert.equal(service.ok,true);assert.ok(service.data.services.some(x=>x.id===svc.data.id))
 const foundUser=await call('admin_find_user',{query:email});assert.equal(foundUser.ok,true);assert.ok(foundUser.data.users.some(x=>x.id===login.user.id))
 const nav=await call('admin_navigate',{target:'operations:services'});assert.equal(nav.ok,true);assert.equal(nav.data.target,'operations:services')
 const invalidNav=await call('admin_navigate',{target:'finance:transfer'});assert.equal(invalidNav.ok,false);assert.equal(invalidNav.code,'INVALID_TARGET')
 const opened=await call('admin_open_service',{service_id:svc.data.id});assert.equal(opened.ok,true);assert.equal(opened.data.serviceId,svc.data.id)
 const refresh=await call('admin_refresh');assert.equal(refresh.ok,true);assert.equal(refresh.data.refreshed,true)
 const forbidden=await call('admin_set_service_status',{service_id:svc.data.id,status:'completado'});assert.equal(forbidden.ok,false);assert.equal(forbidden.code,'UNKNOWN_TOOL')
 const actions=await page.evaluate(()=>window.__ugoAdminActions||[]);assert.ok(actions.some(x=>x.type==='navigate'&&x.target==='operations:services'));assert.ok(actions.some(x=>x.type==='open_service'&&x.service_id));assert.ok(actions.some(x=>x.type==='refresh'))
 const after=await admin.from('servicios').select('estado').eq('id',svc.data.id).single();assert.ifError(after.error);assert.equal(after.data.estado,beforeState)
 const evidence={readiness_id:'hugo-admin-actions',sha,environment:'UGO TEST',production_touched:false,admin_role:profile.data.tipo,summary_read:true,service_search:true,user_search:true,navigation:true,open_service:true,refresh:true,invalid_navigation_blocked:true,dangerous_unknown_tool_blocked:true,service_state_unchanged:true,microphone_audio_pending:true,result:'PASS',completed_at:new Date().toISOString()}
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/hugo-admin-actions-runtime.json',JSON.stringify(evidence,null,2)+'\n');await page.screenshot({path:'artifacts/hugo-admin-actions-runtime.png',fullPage:true});console.log(JSON.stringify(evidence))
}finally{await browser.close();await user.auth.signOut()}
