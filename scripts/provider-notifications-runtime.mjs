import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
import{execFile}from'node:child_process'
import{promisify}from'node:util'
const execFileAsync=promisify(execFile)
import{chromium}from'playwright'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173',sha=process.env.UGO_RUNTIME_SHA||'unknown'
assert.ok(url&&anon&&serviceKey);assert.match(url,/tmossnqfwfwjrtzwcbmm/)
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}),token=sha.slice(0,8)+'-'+Date.now(),password='UGO-Test-'+token+'-A9!'
let providerId=null,clientId=null,serviceId=null,browser=null;const noticeIds=[]
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'provider-notifications',sha,environment:'UGO TEST',channels:{offer:false,assignment:false,change:false,message:false},realtime_without_refresh:false,attention:{tone:false,vibrate:false},offer_origin:'CLIENT_AUTH_AUTOMATIC_PROXIMITY',physical_gps_verified:false,physical_audio_verified:false,physical_vibration_verified:false,fixture_service_created_by:'TEST_SERVICE_ROLE',production_touched:false,result:'FAIL'}
async function mk(kind){const email=`ugo-${kind}-notice-${token}@example.test`;const c=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:`UGO ${kind} Notice`,tipo:kind}});if(c.error)throw c.error;const id=c.data.user.id;let q=await admin.from('usuarios').upsert({id,nombre:`UGO ${kind} Notice`,tipo:kind,activo:true,es_demo:true,online:kind==='proveedor'},{onConflict:'id'});if(q.error)throw q.error;if(kind==='proveedor'){const cat=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(cat.error)throw cat.error;q=await admin.from('perfiles_proveedor').upsert({usuario_id:id,estado_verificacion:'verificado',online:true,disponible:true,onboarding_completo_at:new Date().toISOString(),termos_aceitos_at:new Date().toISOString(),termos_versao:'2026-09-04',categoria_principal_id:cat.data.id,tarifa_base:100},{onConflict:'usuario_id'});if(q.error)throw q.error}return{id,email}}
async function checkedCleanup(query,label){const{error}=await query;if(error)throw new Error(label+': '+error.message)}
async function cleanup(){
 try{
  if(serviceId){
   const{data:owned,error}=await admin.from('servicios').select('cliente_id,proveedor_id,metadata').eq('id',serviceId).maybeSingle()
   if(error)throw error
   if(owned){
    assert.equal(owned.metadata?.readiness_id,'provider-notifications','CLEANUP_OWNERSHIP')
    assert.equal(owned.metadata?.sha,sha,'CLEANUP_SHA')
    assert.equal(owned.metadata?.ephemeral,true,'CLEANUP_EPHEMERAL')
    assert.equal(owned.cliente_id,clientId,'CLEANUP_CLIENT')
    assert.ok(owned.proveedor_id===null||owned.proveedor_id===providerId,'CLEANUP_PROVIDER')
    // Payment-ready matching creates a payment row with a restrictive service FK.
    await checkedCleanup(admin.from('pagos').delete().eq('servicio_id',serviceId),'payments cleanup')
    await checkedCleanup(admin.from('servicios').delete().eq('id',serviceId),'service cleanup')
   }
  }
  for(const id of [providerId,clientId]){
   if(!id)continue
   await checkedCleanup(admin.from('notificaciones').delete().eq('usuario_id',id),'notices cleanup')
   await checkedCleanup(admin.from('perfiles_proveedor').delete().eq('usuario_id',id),'profile cleanup')
   await checkedCleanup(admin.from('usuarios').delete().eq('id',id),'user cleanup')
   await checkedCleanup(admin.auth.admin.deleteUser(id),'auth cleanup')
  }
 }finally{if(browser)await browser.close()}
}
try{
 const provider=await mk('proveedor'),client=await mk('cliente');providerId=provider.id;clientId=client.id
 const cat=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(cat.error)throw cat.error
 const providerAuth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),clientAuth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const pLogin=await providerAuth.auth.signInWithPassword({email:provider.email,password});if(pLogin.error)throw pLogin.error
 const cLogin=await clientAuth.auth.signInWithPassword({email:client.email,password});if(cLogin.error)throw cLogin.error
 const latitude=-27.438,longitude=-48.477
 const online=await providerAuth.rpc('activar_disponibilidad_proveedor',{p_lat:latitude,p_lng:longitude,p_captured_at:new Date().toISOString(),p_accuracy_m:10});if(online.error)throw online.error
 const maxq=await admin.from('servicios').select('numero').order('numero',{ascending:false}).limit(1).single();if(maxq.error)throw maxq.error
 serviceId=crypto.randomUUID();const sq=await admin.from('servicios').insert({id:serviceId,numero:Number(maxq.data.numero)+100001,cliente_id:clientId,categoria_id:cat.data.id,estado:'buscando',descripcion:'UGO provider notification E2E TEST',tarifa:100,ambiente:'demo',metadata:{readiness_id:'provider-notifications',sha,ephemeral:true,request_draft_id:crypto.randomUUID(),payment_method:'efectivo',requested_payment_method:'efectivo'}});if(sq.error)throw sq.error
 const loc=await clientAuth.rpc('guardar_ubicacion_servicio_cliente',{p_servicio_id:serviceId,p_lat:latitude,p_lng:longitude});if(loc.error)throw loc.error
 browser=await chromium.launch({headless:true});const page=await browser.newPage()
 await page.addInitScript(()=>{window.__ugoToneCount=0;window.__ugoVibrateCount=0;const p=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});class A{constructor(){this.state='running';this.currentTime=0;this.destination={}}createOscillator(){return{type:'sine',frequency:p(),connect(){},start(){window.__ugoToneCount++},stop(){}}}createGain(){return{gain:p(),connect(){}}}resume(){return Promise.resolve()}}window.AudioContext=A;navigator.vibrate=()=>{window.__ugoVibrateCount++;return true}})
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'});await page.getByPlaceholder('tu@email.com').fill(provider.email);await page.getByPlaceholder('Mínimo 6 caracteres').fill(password);await page.getByRole('button',{name:'Ingresar a UGO'}).click();await page.getByRole('button',{name:/Notificaciones UGO/}).waitFor({state:'visible',timeout:30000});await page.waitForTimeout(1500)
 // Exercise the actual client PostgREST role, not a SECURITY DEFINER QA function.
 const nonOwner=await providerAuth.rpc('iniciar_matching',{p_servicio_id:serviceId});assert.ok(nonOwner.error,'NON_OWNER_MUST_BE_REJECTED')
 const anonymous=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const anonMatch=await anonymous.rpc('iniciar_matching',{p_servicio_id:serviceId});assert.equal(anonMatch.error?.code,'42501','ANON_MATCHING_MUST_BE_REJECTED')
 evidence.access_guards={non_owner_rejected:true,anonymous_rejected:true}
 // Synthetic TEST position only. Refresh after browser setup to stay within 30 s.
 const fresh=await providerAuth.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:latitude,p_lng:longitude,p_captured_at:new Date().toISOString(),p_accuracy_m:10});if(fresh.error)throw fresh.error
 assert.equal(await page.locator('.ugo-notification-live.is-provider-call').count(),0,'NO_PRIOR_OFFER_BANNER')
 const match=await clientAuth.rpc('iniciar_matching',{p_servicio_id:serviceId});if(match.error)throw match.error
 assert.ok(match.data?.some(row=>row.proveedor_id===providerId),'AUTOMATIC_MATCHING_MUST_SELECT_ELIGIBLE_FIXTURE')
 const offer=await admin.from('ofertas_servicio').select('id,estado,proveedor_id').eq('servicio_id',serviceId).eq('proveedor_id',providerId).maybeSingle();if(offer.error)throw offer.error;if(!offer.data?.id)throw new Error('E2E matching did not persist provider offer')
 const offerNotice=await admin.from('notificaciones').select('id,titulo').eq('usuario_id',providerId).eq('tipo','nueva_oferta').eq('datos->>servicio_id',serviceId).maybeSingle();if(offerNotice.error)throw offerNotice.error;if(!offerNotice.data?.id)throw new Error('E2E matching did not create nueva_oferta notification')
 evidence.persisted_entities={service_id:serviceId,provider_id:providerId,client_id:clientId,offer_id:offer.data.id,offer_notice_id:offerNotice.data.id};noticeIds.push(offerNotice.data.id);await page.locator('.ugo-notification-live.is-provider-call').waitFor({state:'visible',timeout:12000});evidence.channels.offer=true
 await admin.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',offerNotice.data.id);await page.waitForTimeout(300)
 const accepted=await providerAuth.rpc('aceptar_oferta',{p_oferta_id:offer.data.id});if(accepted.error)throw accepted.error
 const persistedAssignment=await admin.from('servicios').select('estado,proveedor_id').eq('id',serviceId).single();if(persistedAssignment.error)throw persistedAssignment.error
 assert.equal(persistedAssignment.data.proveedor_id,providerId,'accepted offer must assign provider')
 assert.ok(['asignado','confirmado'].includes(String(persistedAssignment.data.estado)),'accepted offer must persist assigned state')
 evidence.offer_acceptance={result:'PASS',provider_id:providerId,service_state:persistedAssignment.data.estado}
 const assignedNotice=await admin.from('notificaciones').select('id,titulo').eq('usuario_id',providerId).eq('tipo','trabajo_asignado').eq('datos->>servicio_id',serviceId).maybeSingle()
 if(assignedNotice.error)throw assignedNotice.error
 if(assignedNotice.data?.id){noticeIds.push(assignedNotice.data.id);await page.locator('.ugo-notification-live').getByText(assignedNotice.data.titulo).waitFor({state:'visible',timeout:12000});evidence.channels.assignment=true;await admin.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',assignedNotice.data.id);await page.waitForTimeout(300)}
 else{const ins=await admin.from('notificaciones').insert({usuario_id:providerId,tipo:'trabajo_asignado',titulo:'Asignación TEST UGO',cuerpo:'Readiness TEST',datos:{servicio_id:serviceId,estado:'asignado',runtime_probe:true},dedupe_key:`provider-notifications:${token}:assignment`}).select('id').single();if(ins.error)throw ins.error;noticeIds.push(ins.data.id);await page.locator('.ugo-notification-live').getByText('Asignación TEST UGO').waitFor({state:'visible',timeout:12000});evidence.channels.assignment=true;await admin.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',ins.data.id);await page.waitForTimeout(300)}
 const cases=[{key:'message',tipo:'chat_mensaje',titulo:'Mensaje TEST UGO',datos:{servicio_id:serviceId,runtime_probe:true}}]
 for(const item of cases){const ins=await admin.from('notificaciones').insert({usuario_id:providerId,tipo:item.tipo,titulo:item.titulo,cuerpo:'Readiness TEST',datos:item.datos,dedupe_key:`provider-notifications:${token}:${item.key}`}).select('id').single();if(ins.error)throw ins.error;noticeIds.push(ins.data.id);await page.locator('.ugo-notification-live').getByText(item.titulo).waitFor({state:'visible',timeout:12000});evidence.channels[item.key]=true;await admin.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',ins.data.id);await page.waitForTimeout(300)}
 const upd=await admin.from('servicios').update({estado:'cancelado'}).eq('id',serviceId);if(upd.error)throw upd.error
 const change=await admin.from('notificaciones').insert({usuario_id:providerId,tipo:'servicio_cancelado',titulo:'Cambio TEST UGO',cuerpo:'Servicio cancelado TEST',datos:{servicio_id:serviceId,estado:'cancelado',runtime_probe:true},dedupe_key:`provider-notifications:${token}:change`}).select('id').single();if(change.error)throw change.error;noticeIds.push(change.data.id);await page.locator('.ugo-notification-live').getByText('Cambio TEST UGO').waitFor({state:'visible',timeout:12000});evidence.channels.change=true
 const attention=await page.evaluate(()=>({tone:Number(window.__ugoToneCount||0),vibrate:Number(window.__ugoVibrateCount||0)}));evidence.attention.tone=attention.tone>0;evidence.attention.vibrate=attention.vibrate>0;evidence.realtime_without_refresh=Object.values(evidence.channels).every(Boolean)
 assert.ok(evidence.realtime_without_refresh&&evidence.attention.tone&&evidence.attention.vibrate);evidence.result='PASS'
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-notifications-runtime.json',JSON.stringify(evidence,null,2)+'\n');await page.screenshot({path:'artifacts/provider-notifications-runtime.png',fullPage:true});const judge=await execFileAsync(process.execPath,['scripts/provider-notifications-persistence-judge.mjs'],{env:process.env,maxBuffer:1024*1024});console.log(judge.stdout);console.log(JSON.stringify(evidence))
}finally{await cleanup()}
