import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
import{chromium}from'playwright'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL);assert.ok(serviceKey&&sha)
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now(),password='UGO-Test-'+token+'-A9!'
const pe=`ugo-active-provider-${token}@example.test`,ce=`ugo-active-client-${token}@example.test`
let providerId,clientId,serviceId,browser
async function cleanup(){if(serviceId){await admin.from('pagos').delete().eq('servicio_id',serviceId);await admin.from('servicios').delete().eq('id',serviceId)}for(const id of[providerId,clientId]){if(!id)continue;await admin.from('perfiles_proveedor').delete().eq('usuario_id',id);await admin.from('usuarios').delete().eq('id',id);await admin.auth.admin.deleteUser(id)}if(browser)await browser.close()}
try{
 const p=await admin.auth.admin.createUser({email:pe,password,email_confirm:true,user_metadata:{nombre:'UGO Active Provider',tipo:'proveedor'}});if(p.error)throw p.error;providerId=p.data.user.id
 const c=await admin.auth.admin.createUser({email:ce,password,email_confirm:true,user_metadata:{nombre:'UGO Active Client',tipo:'cliente'}});if(c.error)throw c.error;clientId=c.data.user.id
 const prep=await admin.rpc('autonomous_qa_prepare_provider_active_job',{p_provider_id:providerId,p_client_id:clientId});assert.ifError(prep.error);assert.equal(prep.data.invalid_assignment_blocked,true);assert.equal(prep.data.state,'asignado');assert.equal(prep.data.payment_method,'efectivo');serviceId=prep.data.service_id
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'});await page.getByPlaceholder('tu@email.com').fill(pe);await page.getByPlaceholder('Mínimo 6 caracteres').fill(password);await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.getByText('TRABAJO ACTIVO').waitFor({state:'visible',timeout:30000})
 await page.getByRole('button',{name:'Continuar trabajo'}).click()
 await page.getByRole('heading',{name:'Listo para ir'}).waitFor({state:'visible',timeout:10000})
 await page.getByText('Arreglar canilla de cocina').waitFor({state:'visible',timeout:10000})
 await page.getByText(/Rua UGO TEST 100/).waitFor({state:'visible',timeout:10000})
 await page.getByText(/Efectivo|Pago en efectivo/).first().waitFor({state:'visible',timeout:10000})
 const going=page.getByRole('button',{name:'ESTOY YENDO'});await going.waitFor({state:'visible',timeout:10000});assert.equal(await going.isDisabled(),false)
 await page.getByText('Fotos o detalles del cliente').waitFor({state:'visible',timeout:10000})
 const evidence={readiness_id:'provider-active-jobs',sha,environment:'UGO TEST',production_touched:false,invalid_assignment_blocked:true,service_id:serviceId,state:'asignado',payment_method:'efectivo',description_visible:true,address_visible:true,evidence_entry_visible:true,primary_action_enabled:true,result:'PASS',completed_at:new Date().toISOString()}
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/provider-active-jobs-runtime.json',JSON.stringify(evidence,null,2)+'\n');await page.screenshot({path:'artifacts/provider-active-jobs-runtime.png',fullPage:true});console.log(JSON.stringify(evidence))
}finally{await cleanup()}
