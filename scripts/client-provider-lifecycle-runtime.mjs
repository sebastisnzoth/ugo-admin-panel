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
 {data:payment,error:paymentError},
 {data:evidence,error:evidenceError},
 {data:ratings,error:ratingsError},
 {data:offers,error:offersError}
]=await Promise.all([
 db.from('servicios').select('id,numero,estado,ambiente,cliente_id,proveedor_id,created_at,completado_at').eq('id',serviceId).single(),
 db.from('servicio_estado_eventos').select('estado_anterior,estado_nuevo,actor_role,created_at').eq('servicio_id',serviceId).order('created_at'),
 db.from('pagos').select('id,metodo,estado,fecha_confirmacion').eq('servicio_id',serviceId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
 db.from('evidencias_servicio').select('id,tipo,storage_path,created_at').eq('servicio_id',serviceId).order('created_at'),
 db.from('resenas').select('id,autor_tipo,puntuacion').eq('servicio_id',serviceId),
 db.from('ofertas_servicio').select('id,proveedor_id,estado,distancia_km').eq('servicio_id',serviceId).order('created_at')
])
for(const e of[serviceError,eventsError,paymentError,evidenceError,ratingsError,offersError])if(e)throw e

assert.equal(service.ambiente,'demo')
assert.equal(service.estado,'completado')
assert.ok(service.cliente_id&&service.proveedor_id&&service.completado_at)
const expected=['ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado']
let cursor=-1
for(const state of expected){
 const next=events.findIndex((x,i)=>i>cursor&&x.estado_nuevo===state)
 assert.ok(next>cursor,'missing lifecycle state '+state)
 cursor=next
}
assert.ok(offers.some(x=>x.estado==='aceptada'&&x.proveedor_id===service.proveedor_id&&Number(x.distancia_km||0)<=20))
assert.equal(payment?.metodo,'efectivo')
assert.equal(payment?.estado,'liberado')
assert.ok(payment?.fecha_confirmacion)
assert.ok(evidence.some(x=>x.tipo==='antes'))
assert.ok(evidence.some(x=>x.tipo==='despues'))
assert.ok(ratings.length>=2)

const{data:auditJob,error:auditError}=await db.rpc('autonomous_record_p0_journey_test',{p_service_id:serviceId})
if(auditError)throw auditError
assert.equal(auditJob.status,'SUCCEEDED')
assert.equal(auditJob.service_id,serviceId)
assert.equal(auditJob.verification_result?.passed,true)

const[{count:decisionCount,error:decisionError},{count:evidenceLedgerCount,error:evidenceLedgerError}]=await Promise.all([
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',auditJob.id),
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',auditJob.id)
])
if(decisionError)throw decisionError
if(evidenceLedgerError)throw evidenceLedgerError
assert.equal(decisionCount,1)
assert.equal(evidenceLedgerCount,1)

const out={
 readiness_id:'client-provider-lifecycle',
 sha,
 environment:'UGO TEST',
 production_touched:false,
 service_id:serviceId,
 service_number:service.numero,
 result:'PASS',
 lifecycle:expected,
 checks:{
  matching_offer_acceptance:true,
  canonical_state_order:true,
  payment_release:true,
  before_after_evidence:true,
  bilateral_ratings:true,
  audit_decision_ledger:true,
  audit_evidence_ledger:true
 },
 limitations:{
  simulated_service:true,
  physical_gps_verified:false,
  physical_camera_verified:false,
  real_human_customer_acceptance:false,
  live_microphone_hugo_verified:false
 },
 audit_job_id:auditJob.id,
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/client-provider-lifecycle-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
