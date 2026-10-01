import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const anonKey=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(serviceKey&&anonKey&&sha,'UGO_TEST_CREDENTIALS_AND_SHA_REQUIRED')

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now()
const password='UGO-Test-'+token+'-A9!'
const providerEmail=`ugo-workflow-provider-${token}@example.test`
const clientEmail=`ugo-workflow-client-${token}@example.test`
let providerId=null,clientId=null,serviceId=null
const storagePaths=[]
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=','base64')

async function cleanup(){
  if(storagePaths.length)await admin.storage.from('service-evidence').remove(storagePaths)
  if(serviceId){
    await admin.from('evidencias_servicio').delete().eq('servicio_id',serviceId)
    await admin.from('pagos').delete().eq('servicio_id',serviceId)
    await admin.from('servicios').delete().eq('id',serviceId)
  }
  for(const id of[providerId,clientId]){
    if(!id)continue
    await admin.from('perfiles_proveedor').delete().eq('usuario_id',id)
    await admin.from('usuarios').delete().eq('id',id)
    await admin.auth.admin.deleteUser(id)
  }
}
async function readState(){
  const{data,error}=await admin.from('servicios').select('estado').eq('id',serviceId).single()
  if(error)throw error
  return data.estado
}
async function uploadEvidence(kind){
  const path=`${serviceId}/${providerId}/${kind}-${token}.jpg`
  const up=await admin.storage.from('service-evidence').upload(path,jpeg,{contentType:'image/jpeg',upsert:false})
  if(up.error)throw up.error
  storagePaths.push(path)
  const ins=await admin.from('evidencias_servicio').insert({servicio_id:serviceId,usuario_id:providerId,tipo:kind,storage_path:path,descripcion:`UGO provider workflow ${kind}`,metadata:{source:'provider-workflow-runtime',size:jpeg.length}})
  if(ins.error)throw ins.error
  return path
}

try{
  const p=await admin.auth.admin.createUser({email:providerEmail,password,email_confirm:true,user_metadata:{nombre:'UGO Workflow Provider',tipo:'proveedor'}})
  if(p.error)throw p.error
  providerId=p.data.user.id
  const c=await admin.auth.admin.createUser({email:clientEmail,password,email_confirm:true,user_metadata:{nombre:'UGO Workflow Client',tipo:'cliente'}})
  if(c.error)throw c.error
  clientId=c.data.user.id

  const prep=await admin.rpc('autonomous_qa_prepare_provider_active_job',{p_provider_id:providerId,p_client_id:clientId})
  if(prep.error)throw prep.error
  serviceId=prep.data.service_id
  assert.equal(prep.data.state,'asignado')

  const forceArrival=await admin.from('servicios').update({estado:'llegado'}).eq('id',serviceId).select('estado').single()
  if(forceArrival.error)throw forceArrival.error
  assert.equal(forceArrival.data.estado,'llegado')

  const provider=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const login=await provider.auth.signInWithPassword({email:providerEmail,password})
  if(login.error)throw login.error

  const noInitial=await provider.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:'en_progreso'})
  assert.ok(noInitial.error,'INITIAL_EVIDENCE_GATE_MUST_REJECT')
  assert.match(noInitial.error.message,/foto inicial|evidencia inicial/i)
  assert.equal(await readState(),'llegado','INITIAL_REJECTION_MUST_NOT_ADVANCE')

  const beforePath=await uploadEvidence('antes')
  const start=await provider.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:'en_progreso'})
  if(start.error)throw start.error
  assert.equal(await readState(),'en_progreso','START_MUST_PERSIST')

  const noFinal=await provider.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:'esperando_aprobacion'})
  assert.ok(noFinal.error,'FINAL_EVIDENCE_GATE_MUST_REJECT')
  assert.match(noFinal.error.message,/foto final|evidencia final/i)
  assert.equal(await readState(),'en_progreso','FINAL_REJECTION_MUST_NOT_ADVANCE')

  const afterPath=await uploadEvidence('despues')
  const finish=await provider.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:'esperando_aprobacion'})
  if(finish.error)throw finish.error
  assert.equal(await readState(),'esperando_aprobacion','FINISH_MUST_PERSIST')

  const backwards=await provider.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:'en_progreso'})
  assert.ok(backwards.error,'BACKWARD_TRANSITION_MUST_REJECT')
  assert.match(backwards.error.message,/Transición de estado no permitida/i)
  assert.equal(await readState(),'esperando_aprobacion','INVALID_TRANSITION_MUST_NOT_MUTATE')

  const evidence={readiness_id:'provider-workflow',sha,environment:'UGO TEST',productionTouched:false,serviceId,observations:{initial_evidence_required:true,initial_rejection_no_advance:true,start_persisted:true,final_evidence_required:true,final_rejection_no_advance:true,finish_persisted:true,backward_transition_rejected:true,invalid_transition_no_mutation:true},states:['llegado','en_progreso','esperando_aprobacion'],beforePath,afterPath,result:'PASS',completed_at:new Date().toISOString()}
  await fs.mkdir('artifacts',{recursive:true})
  await fs.writeFile('artifacts/provider-workflow-runtime.json',JSON.stringify(evidence,null,2)+'\n')
  console.log(JSON.stringify(evidence))
}finally{await cleanup()}
