import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{randomUUID}from'node:crypto'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(key&&sha,'PILOT_E2E_RUNTIME_INPUTS_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
await fs.mkdir('artifacts',{recursive:true})
const results=[]
for(const slug of ['faxina','marido-de-aluguel']){
 const{data:sid,error:runError}=await db.rpc('pilot_qa_run_category_e2e',{p_slug:slug});assert.ifError(runError);assert.ok(sid)
 const correlation=randomUUID()
 const[{data:s,error:se},{data:cat,error:ce},{data:offers,error:oe},{data:evidence,error:ee},{data:payments,error:pe},{data:ratings,error:re},{data:states,error:stateError},{data:debts,error:debtError}]=await Promise.all([
  db.from('servicios').select('id,numero,estado,ambiente,proveedor_id,categoria_id,metadata,descripcion,completado_at').eq('id',sid).single(),
  db.from('categorias').select('id,slug,nombre').eq('id',(await db.from('servicios').select('categoria_id').eq('id',sid).single()).data?.categoria_id).single(),
  db.from('ofertas_servicio').select('id,estado,proveedor_id,distancia_km').eq('servicio_id',sid).order('created_at'),
  db.from('evidencias_servicio').select('id,tipo,storage_path,metadata').eq('servicio_id',sid).order('created_at'),
  db.from('pagos').select('id,metodo,estado,fecha_confirmacion,monto_bruto,comision_ugo').eq('servicio_id',sid),
  db.from('resenas').select('id,autor_tipo,puntuacion').eq('servicio_id',sid),
  db.rpc('service_role_pilot_lifecycle_states',{p_service_id:sid}),
  db.from('deudas_ugo_proveedor').select('id,ambiente,estado,comision_ugo,saldo_pendiente').eq('servicio_id',sid)
 ])
 for(const e of [se,ce,oe,ee,pe,re,stateError,debtError])assert.ifError(e)
 assert.equal(cat.slug,slug);assert.equal(s.estado,'completado');assert.equal(s.ambiente,'demo');assert.ok(s.proveedor_id);assert.equal(s.metadata?.pilot_e2e,true)
 assert.equal(s.metadata?.pilot_kind,slug==='faxina'?'faxina':'marido');assert.ok(s.metadata?.pilot_details);assert.equal(s.metadata?.scope_change?.approved,true)
 assert.ok(offers.some(o=>o.estado==='aceptada'),'accepted offer required');assert.ok(evidence.some(e=>e.tipo==='antes'));assert.ok(evidence.some(e=>e.tipo==='despues'))
 assert.ok(payments.some(p=>p.metodo==='efectivo'&&p.fecha_confirmacion),'confirmed cash payment required')
 assert.equal(new Set(ratings.map(r=>r.autor_tipo)).size,2,'bilateral ratings required')
 for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])assert.ok((states||[]).includes(state),`missing lifecycle state ${state}`)
 for(const debt of debts||[])assert.notEqual(debt.ambiente,'real','pilot demo must not create real provider debt')
 const{data:bound,error:bindError}=await db.rpc('service_role_bind_p0_audit_chain',{p_service_id:sid,p_correlation_id:correlation});assert.ifError(bindError);assert.equal(bound?.passed,true)
 const{data:judged,error:judgeError}=await db.rpc('service_role_judge_p0_audit_chain',{p_service_id:sid,p_correlation_id:correlation});assert.ifError(judgeError);assert.equal(judged?.passed,true)
 results.push({slug,service_id:sid,correlation_id:correlation,category:cat,service:{numero:s.numero,estado:s.estado,ambiente:s.ambiente,provider_id:s.proveedor_id,description:s.descripcion,completed_at:s.completado_at,pilot_kind:s.metadata.pilot_kind,pilot_details:s.metadata.pilot_details,scope_change:s.metadata.scope_change},offer_count:offers.length,accepted_offer_id:offers.find(o=>o.estado==='aceptada')?.id||null,evidence:evidence.map(e=>({id:e.id,tipo:e.tipo,path:e.storage_path})),payment:payments.map(p=>({id:p.id,method:p.metodo,state:p.estado,confirmed_at:p.fecha_confirmacion,amount:p.monto_bruto,ugo_commission:p.comision_ugo})),ratings:ratings.map(r=>({id:r.id,author:r.autor_tipo,score:r.puntuacion})),states:states||[],audit_judge:judged,debt_rows:(debts||[]).map(d=>({id:d.id,environment:d.ambiente,state:d.estado,balance:d.saldo_pendiente})),result:'PASS'})
}
const out={readiness_ids:['pilot-e2e-faxina','pilot-e2e-marido','pilot-payments','pilot-ratings-history','pilot-runtime-faxina','pilot-runtime-marido','pilot-judge-sentinel'],environment:'UGO TEST',sha,results,result:'PASS',completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/pilot-e2e-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,services:results.map(r=>({slug:r.slug,id:r.service_id,correlation:r.correlation_id}))}))
