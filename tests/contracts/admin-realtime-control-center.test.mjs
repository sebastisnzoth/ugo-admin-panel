import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('admin operations recover from missed realtime events without tab refresh',async()=>{
 const hook=await read('src/hooks/useAdminActiveServices.ts')
 assert.match(hook,/table: 'servicios'/)
 assert.match(hook,/table: 'servicio_estado_eventos'/)
 assert.match(hook,/table: 'perfiles_proveedor'/)
 assert.match(hook,/table: 'deudas_ugo_proveedor'/)
 assert.match(hook,/SUBSCRIBED/)
 assert.match(hook,/CHANNEL_ERROR/)
 assert.match(hook,/TIMED_OUT/)
 assert.match(hook,/visibilitychange/)
 assert.match(hook,/addEventListener\('online'/)
 assert.match(hook,/setInterval\([^]*POLL_MS/)
 assert.match(hook,/POLL_MS=8000/)
})

test('admin dashboard metrics stay live and truthfully show degraded realtime',async()=>{
 const src=await read('src/mvp/AdminPhase2.tsx')
 assert.match(src,/ugo-admin-phase2-\$\{channelEpoch\}/)
 assert.match(src,/table:'servicios'/)
 assert.match(src,/table:'usuarios'/)
 assert.match(src,/table:'pagos'/)
 assert.match(src,/table:'deudas_ugo_proveedor'/)
 assert.match(src,/Sistema en vivo/)
 assert.match(src,/Realtime degradado/)
 assert.match(src,/setInterval/)
})

test('service 360 sheet refreshes trace chat payments disputes and evidence live',async()=>{
 const[services,trace,extended]=await Promise.all([
  read('src/mvp/AdminServicesPro.tsx'),
  read('src/mvp/AdminServiceTracePanel.tsx'),
  read('src/mvp/AdminServiceExtendedTrace.tsx'),
 ])
 assert.match(services,/Ficha 360°/)
 assert.match(services,/Control integral del servicio/)
 assert.match(services,/services\.find\(\(row:any\)=>row\.id===editing\.id\)/)
 for(const table of ['servicio_estado_eventos','eventos_servicio','pagos','deudas_ugo_proveedor','resenas','evidencias_solicitud','evidencias_servicio']){
  assert.match(trace,new RegExp("table:'"+table+"'"))
 }
 assert.match(trace,/filter:`servicio_id=eq\.\$\{service\.id\}`/)
 assert.match(extended,/table:'mensajes'/)
 assert.match(extended,/table:'disputas'/)
 assert.match(extended,/table:'disputa_mensajes'/)
 assert.match(extended,/table:'perfiles_proveedor'/)
 assert.match(extended,/setInterval/)
})

test('admin 360 audit sources are published to realtime',async()=>{
 const sql=await read('supabase/migrations/20260920133000_admin_operational_realtime_publication.sql')
 for(const table of ['servicio_estado_eventos','eventos_servicio','evidencias_solicitud','resenas','deudas_ugo_proveedor','disputa_mensajes']){
  assert.match(sql,new RegExp("'"+table+"'"))
 }
 assert.match(sql,/alter publication supabase_realtime add table/)
})

test('admin alert center reacts to service provider and debt changes with fallback polling',async()=>{
 const src=await read('src/hooks/useAdminData.ts')
 assert.match(src,/servicio_estado_eventos/)
 assert.match(src,/perfiles_proveedor/)
 assert.match(src,/deudas_ugo_proveedor/)
 assert.match(src,/setInterval\(sync, 10_000\)/)
})


test('admin operational exception queue derives stuck and inconsistent work from persisted state',async()=>{
 const src=await read('src/mvp/AdminDecisionCenter.tsx')
 assert.match(src,/matching_demorado/)
 assert.match(src,/traslado_demorado/)
 assert.match(src,/aprobacion_demorada/)
 assert.match(src,/servicio_inconsistente/)
 assert.match(src,/proveedor_deuda_ugo/)
 assert.match(src,/useAdminActiveServices/)
})


test('admin deep-links alerts and home activity to the exact 360 service sheet',async()=>{
 const[phase,home,services,alerts]=await Promise.all([
  read('src/mvp/AdminPhase2.tsx'),
  read('src/mvp/AdminHomeStitch.tsx'),
  read('src/mvp/AdminServicesPro.tsx'),
  read('src/mvp/AdminDecisionCenter.tsx'),
 ])
 assert.match(phase,/onOpenService=\{openService\}/)
 assert.match(phase,/initialServiceId=\{selectedServiceId\}/)
 assert.match(home,/onClick=\{\(\)=>onOpenService\(service\.id\)\}/)
 assert.match(services,/initialServiceId/)
 assert.match(alerts,/Abrir ficha 360°/)
})
