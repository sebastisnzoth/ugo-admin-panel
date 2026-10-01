import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createHash}from'node:crypto'
import{createClient}from'@supabase/supabase-js'
import{chromium}from'playwright'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL);assert.ok(serviceKey&&sha)
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now(),password='UGO-Test-'+token+'-A9!'
const providerEmail=`ugo-evidence-provider-${token}@example.test`,clientEmail=`ugo-evidence-client-${token}@example.test`
const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNg+M8AAAACAAHiIbwzAAAAAElFTkSuQmCC','base64')
let providerId,clientId,serviceId,browser,paths=[]
const cleanup=async()=>{
 if(paths.length)await admin.storage.from('service-evidence').remove(paths)
 if(serviceId){await admin.from('evidencias_servicio').delete().eq('servicio_id',serviceId);await admin.from('pagos').delete().eq('servicio_id',serviceId);await admin.from('servicios').delete().eq('id',serviceId)}
 if(providerId){await admin.from('perfiles_proveedor').delete().eq('usuario_id',providerId);await admin.from('usuarios').delete().eq('id',providerId);await admin.auth.admin.deleteUser(providerId)}
 if(clientId){await admin.from('usuarios').delete().eq('id',clientId);await admin.auth.admin.deleteUser(clientId)}
 if(browser)await browser.close()
}
try{
 const{data:category,error:categoryError}=await admin.from('categorias').select('id').eq('activa',true).order('nombre').limit(1).maybeSingle()
 assert.ifError(categoryError);assert.ok(category?.id,'ACTIVE_CATEGORY_REQUIRED')
 const p=await admin.auth.admin.createUser({email:providerEmail,password,email_confirm:true,user_metadata:{nombre:'UGO Evidence Provider',tipo:'proveedor'}});if(p.error)throw p.error;providerId=p.data.user.id
 const c=await admin.auth.admin.createUser({email:clientEmail,password,email_confirm:true,user_metadata:{nombre:'UGO Evidence Client',tipo:'cliente'}});if(c.error)throw c.error;clientId=c.data.user.id
 assert.ifError((await admin.from('usuarios').insert({id:providerId,nombre:'UGO Evidence Provider',tipo:'proveedor',activo:true,es_demo:true})).error)
 assert.ifError((await admin.from('usuarios').insert({id:clientId,nombre:'UGO Evidence Client',tipo:'cliente',activo:true,es_demo:true})).error)
 assert.ifError((await admin.from('perfiles_proveedor').insert({usuario_id:providerId,estado_verificacion:'verificado',online:true,disponible:true,onboarding_completo_at:new Date().toISOString(),termos_aceitos_at:new Date().toISOString(),termos_versao:'2026-09-04',categoria_principal_id:category.id,tarifa_base:100,zona_radio_km:20})).error)
 const{data:service,error:serviceError}=await admin.from('servicios').insert({
  numero:Math.floor(Date.now()/1000),cliente_id:clientId,proveedor_id:providerId,categoria_id:category.id,estado:'llegado',
  descripcion:'UGO TEST provider evidence fresh runtime',direccion_cliente:'Rua UGO TEST Evidence 100, Florianópolis',
  ubicacion_cliente:'SRID=4326;POINT(-48.5482 -27.5949)',tarifa:120,comision_ugo:18,ganancia_proveedor:102,
  metadata:{requested_payment_method:'efectivo',payment_method:'efectivo',payment_selected_before_order:true,provider_evidence_runtime:true},
  ambiente:'demo'
 }).select('id').single()
 if(serviceError)throw serviceError;serviceId=service.id
 assert.ifError((await admin.from('pagos').insert({servicio_id:serviceId,cliente_id:clientId,proveedor_id:providerId,procesador:'efectivo',monto_bruto:120,comision_ugo:18,ganancia_proveedor:102,moneda:'BRL',estado:'pendiente',metodo:'efectivo',modelo_pago:'presencial',ambiente:'demo'})).error)

 const pageErrors=[]
 browser=await chromium.launch({headless:true})
 const page=await browser.newPage({viewport:{width:390,height:844}})
 page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)))
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
 await page.getByPlaceholder('tu@email.com').fill(providerEmail)
 await page.getByPlaceholder('Mínimo 6 caracteres').fill(password)
 await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.getByText('TRABAJO ACTIVO').waitFor({state:'visible',timeout:30000})
 await page.getByRole('button',{name:/Trabajo activo:/}).first().click()
 await page.getByRole('heading',{name:'Ya estás en el lugar'}).waitFor({state:'visible',timeout:15000})

 const evidenceInput=page.locator('.provider-evidence-compact-file input[type=file]').first()
 await evidenceInput.setInputFiles({name:'evidence-before.png',mimeType:'image/png',buffer:fixture})
 await page.getByRole('heading',{name:'Resolvé el problema'}).waitFor({state:'visible',timeout:15000})
 const{data:initial,error:initialError}=await admin.from('evidencias_servicio').select('id,tipo,storage_path').eq('servicio_id',serviceId).eq('tipo','antes')
 assert.ifError(initialError);assert.equal(initial?.length,1,'INITIAL_EVIDENCE_COUNT_INVALID');paths.push(initial[0].storage_path)

 await evidenceInput.setInputFiles({name:'evidence-after.png',mimeType:'image/png',buffer:fixture})
 await page.waitForTimeout(1000)
 const{data:final,error:finalError}=await admin.from('evidencias_servicio').select('id,tipo,storage_path').eq('servicio_id',serviceId).eq('tipo','despues')
 assert.ifError(finalError);assert.equal(final?.length,1,'FINAL_EVIDENCE_COUNT_INVALID');paths.push(final[0].storage_path)

 const{data:all,error:allError}=await admin.from('evidencias_servicio').select('id,tipo,storage_path,created_at').eq('servicio_id',serviceId).order('created_at',{ascending:true})
 assert.ifError(allError);assert.equal(all?.length,2,'EVIDENCE_TOTAL_INVALID');assert.deepEqual(all.map(row=>row.tipo),['antes','despues']);assert.equal(new Set(all.map(row=>row.storage_path)).size,2)
 const bytes=[]
 for(const row of all){const{data:signed,error:signedError}=await admin.storage.from('service-evidence').createSignedUrl(row.storage_path,120);assert.ifError(signedError);assert.ok(signed?.signedUrl,'SIGNED_URL_REQUIRED');const response=await fetch(signed.signedUrl);assert.equal(response.ok,true,'EVIDENCE_FETCH_FAILED');const buffer=Buffer.from(await response.arrayBuffer());assert.ok(buffer.length>0,'EVIDENCE_BYTES_REQUIRED');bytes.push({path:row.storage_path,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')})}
 const publicUrl=path=>url+'/storage/v1/object/public/service-evidence/'+path.split('/').map(encodeURIComponent).join('/')
 const publicResponses=await Promise.all(bytes.map(item=>fetch(publicUrl(item.path),{redirect:'manual'})));assert.equal(publicResponses.some(r=>r.ok),false,'PRIVATE_BUCKET_PUBLIC_ACCESS_UNEXPECTED')
 const{data:mediaJob,error:mediaError}=await admin.rpc('autonomous_record_uploaded_media_runtime',{p_service_id:serviceId,p_before_path:bytes[0].path,p_after_path:bytes[1].path,p_before_sha256:bytes[0].sha256,p_after_sha256:bytes[1].sha256,p_before_bytes:bytes[0].bytes,p_after_bytes:bytes[1].bytes,p_public_denied:true})
 assert.ifError(mediaError);assert.equal(mediaJob?.status,'SUCCEEDED','UPLOADED_MEDIA_RUNTIME_NOT_SUCCEEDED');assert.equal(mediaJob?.verification_result?.passed,true,'UPLOADED_MEDIA_RUNTIME_NOT_VERIFIED')
 const{data:coverage,error:coverageError}=await admin.from('autonomous_quality_coverage').select('status').eq('coverage_key','uploaded-media-bytes').single();assert.ifError(coverageError);assert.equal(coverage.status,'COVERED')
 assert.deepEqual(pageErrors,[])
 const{data:persistedService,error:persistedServiceError}=await admin.from('servicios').select('estado').eq('id',serviceId).single();assert.ifError(persistedServiceError)
 const result={readiness_id:'provider-evidence',sha,environment:'UGO TEST',productionTouched:false,persistedRowsAndBytes:true,initialEvidence:true,finalEvidence:true,stateGuardContract:true,uiFlowContract:true,privateBucket:true,publicAccessDenied:true,serviceId,qaJobId:mediaJob.id,beforeBytes:bytes[0].bytes,afterBytes:bytes[1].bytes,coverage:coverage.status,serviceStateAfterEvidence:persistedService?.estado||null,exactEvidenceRows:2,duplicateRows:0,pageErrors:0,result:'PASS',completedAt:new Date().toISOString()}
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/provider-evidence-runtime.json',JSON.stringify(result,null,2)+'\\n');await page.screenshot({path:'artifacts/provider-evidence-runtime.png',fullPage:true});console.log(JSON.stringify(result))
}finally{await cleanup()}
