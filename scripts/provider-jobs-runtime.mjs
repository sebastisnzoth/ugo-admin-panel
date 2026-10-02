import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.ok(key&&sha)
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const serviceId='21116af1-fbff-4800-accf-e984c157bf80'
const service=await db.from('servicios').select('id,numero,estado,created_at,updated_at,programado_para,completado_at,direccion_cliente,tarifa').eq('id',serviceId).single();if(service.error)throw service.error
const evidence=await db.from('evidencias_servicio').select('tipo,storage_path,created_at').eq('servicio_id',serviceId).order('created_at');if(evidence.error)throw evidence.error
const events=await db.from('servicio_estado_eventos').select('estado_anterior,estado_nuevo,actor_role,created_at').eq('servicio_id',serviceId).order('created_at');if(events.error)throw events.error
const payment=await db.from('pagos').select('metodo,estado,monto_bruto,comision_ugo,ganancia_proveedor,moneda,created_at,liberado_at').eq('servicio_id',serviceId).order('created_at',{ascending:false}).limit(1).single();if(payment.error)throw payment.error
assert.equal(service.data.estado,'completado');assert.ok(service.data.created_at&&service.data.completado_at&&service.data.direccion_cliente)
for(const kind of['antes','despues'])assert.ok(evidence.data.some(x=>x.tipo===kind),kind)
for(const state of['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])assert.ok(events.data.some(x=>x.estado_nuevo===state),state)
assert.equal(payment.data.metodo,'efectivo');assert.equal(payment.data.estado,'liberado');assert.equal(Number(payment.data.monto_bruto),120);assert.equal(Number(payment.data.comision_ugo),18);assert.equal(Number(payment.data.ganancia_proveedor),102)
let bytes=0
for(const row of evidence.data.filter(x=>x.tipo==='antes'||x.tipo==='despues')){const dl=await db.storage.from('service-evidence').download(row.storage_path);if(dl.error)throw dl.error;bytes+=(await dl.data.arrayBuffer()).byteLength}
assert.ok(bytes>0)
const out={readiness_id:'provider-jobs',sha,environment:'UGO TEST',productionTouched:false,serviceId,observations:{completed_service_visible:true,dates_present:true,address_present:true,evidence_before_after_visible:true,evidence_bytes_readable:true,payment_visible:true,payment_amounts_concordant:true,timeline_visible:true,timeline_states_concordant:true},counts:{evidence:evidence.data.length,events:events.data.length,bytes},result:'PASS',completed_at:new Date().toISOString()}
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/provider-jobs-runtime.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
