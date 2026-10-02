import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co')
assert.ok(key)
assert.match(sha,/^[0-9a-f]{40}$/)

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:serviceId,error:runError}=await db.rpc('autonomous_qa_run_p0_test_service')
if(runError)throw runError
assert.ok(serviceId)

const[
 {data:service,error:serviceError},
 {data:events,error:eventsError},
 {data:evidence,error:evidenceError},
 {data:payments,error:paymentsError},
 {data:ratings,error:ratingsError},
 {data:offers,error:offersError}
]=await Promise.all([
 db.from('servicios').select('id,numero,estado,ambiente,proveedor_id,cliente_id,created_at,completado_at').eq('id',serviceId).single(),
 db.from('servicio_estado_eventos').select('estado_anterior,estado_nuevo,actor_role,created_at').eq('servicio_id',serviceId).order('created_at'),
 db.from('evidencias_servicio').select('id,tipo,storage_path,created_at').eq('servicio_id',serviceId).order('created_at'),
 db.from('pagos').select('id,metodo,estado,fecha_confirmacion,monto_bruto,comision_ugo,ganancia_proveedor').eq('servicio_id',serviceId),
 db.from('resenas').select('id,rol_autor,puntuacion').eq('servicio_id',serviceId),
 db.from('ofertas_servicio').select('id,proveedor_id,estado,distancia_km').eq('servicio_id',serviceId)
])
for(const e of[serviceError,eventsError,evidenceError,paymentsError,ratingsError,offersError])if(e)throw e
assert.equal(service.ambiente,'demo')
assert.equal(service.estado,'completado')
assert.ok(service.proveedor_id)
assert.ok(service.cliente_id)
assert.ok(service.completado_at)
for(const state of['ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])assert.ok(events.some(x=>x.estado_nuevo===state),state)
assert.ok(evidence.some(x=>x.tipo==='antes'))
assert.ok(evidence.some(x=>x.tipo==='despues'))
assert.ok(payments.some(x=>x.metodo==='efectivo'&&x.estado==='liberado'&&x.fecha_confirmacion))
assert.ok(ratings.length>=2)
assert.ok(offers.some(x=>x.estado==='aceptada'&&Number(x.distancia_km||0)<=20))

const{data:judgeJob,error:judgeError}=await db.rpc('autonomous_record_p0_journey_test',{p_service_id:serviceId})
if(judgeError)throw judgeError
assert.equal(judgeJob.status,'SUCCEEDED')
assert.equal(judgeJob.service_id,serviceId)
assert.equal(judgeJob.verification_result?.passed,true)
assert.equal(judgeJob.verification_result?.simulated_service,true)
assert.equal(judgeJob.verification_result?.physical_gps_verified,false)
assert.equal(judgeJob.verification_result?.uploaded_media_verified,false)
assert.equal(judgeJob.verification_result?.customer_acceptance,false)

const[{count:decisionCount,error:decisionError},{count:evidenceLedgerCount,error:evidenceLedgerError}]=await Promise.all([
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',judgeJob.id),
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',judgeJob.id)
])
if(decisionError)throw decisionError
if(evidenceLedgerError)throw evidenceLedgerError
assert.equal(decisionCount,1)
assert.equal(evidenceLedgerCount,1)

const out={
 readiness_id:'cross-p0',
 sha,
 environment:'UGO TEST',
 production_touched:false,
 service_id:serviceId,
 service_number:service.numero,
 result:'PASS',
 checks:{
  completed:true,
  offer_within_20km:true,
  lifecycle_chain:true,
  evidence_rows:true,
  cash_payment:true,
  bilateral_ratings:true,
  correlated_decision_ledger:true,
  correlated_evidence_ledger:true
 },
 limitations:{
  simulated_service:true,
  physical_gps_verified:false,
  uploaded_media_verified:false,
  real_human_customer_acceptance:false
 },
 judge_job_id:judgeJob.id,
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/cross-p0-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
