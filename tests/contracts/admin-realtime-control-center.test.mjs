import './i18n-test-compat.mjs'
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
 assert.match(src,/t\('adminPhase2\.live'\)/)
 assert.match(src,/t\('adminPhase2\.degraded'\)/)
 assert.match(src,/setInterval/)
 assert.match(src,/const scheduleRefresh=\(\)=>/)
 assert.match(src,/if\(refreshing\)\{queued=true;return\}/)
 assert.match(src,/Math\.max\(350,3000-/)
 assert.match(src,/if\(refreshTimer!==undefined\)window\.clearTimeout\(refreshTimer\)/)
 assert.match(src,/if\(reconnectTimer!==undefined\)window\.clearTimeout\(reconnectTimer\)/)
 assert.doesNotMatch(src,/scheduleReconcile\(250\)/)
})

test('service 360 sheet refreshes trace chat payments disputes and evidence live',async()=>{
 const[services,trace,extended]=await Promise.all([
  read('src/mvp/AdminServicesPro.tsx'),
  read('src/mvp/AdminServiceTracePanel.tsx'),
  read('src/mvp/AdminServiceExtendedTrace.tsx'),
 ])
 assert.match(services,/t\('screen\.admin_services\.14'\)/)
 assert.match(services,/t\('screen\.admin_services\.15'\)/)
 assert.match(services,/services\.find\(\(row:any\)=>row\.id===editingId\)/)
 for(const table of ['servicio_estado_eventos','eventos_servicio','pagos','deudas_ugo_proveedor','resenas','evidencias_solicitud','evidencias_servicio']){
  assert.match(trace,new RegExp("'"+table+"'"))
 }
 assert.match(trace,/for\(const table of scoped\)channel=channel\.on\('postgres_changes',\{event:'\*',schema:'public',table,filter:`servicio_id=eq\.\$\{service\.id\}`\}/)
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
 const fallback=src.match(/setInterval\(sync, ([\d_]+)\)/)
 assert.ok(fallback,'admin alert center must keep a fallback polling loop')
 const fallbackMs=Number(fallback[1].replaceAll('_',''))
 assert.ok(fallbackMs>=10_000&&fallbackMs<=60_000,'admin fallback polling must stay between 10 s and 60 s')
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

test('admin 360 service trace rebuilds both realtime channels after failure',async()=>{
 const[trace,extended]=await Promise.all([
  read('src/mvp/AdminServiceTracePanel.tsx'),
  read('src/mvp/AdminServiceExtendedTrace.tsx'),
 ])
 for(const source of[trace,extended]){
  assert.match(source,/channelEpoch/)
  assert.match(source,/setChannelEpoch\(value=>value\+1\)/)
  assert.match(source,/CHANNEL_ERROR/)
  assert.match(source,/TIMED_OUT/)
  assert.match(source,/CLOSED/)
  assert.match(source,/const onOnline=\(\)=>\{sync\(\);reconnect\(\)\}/)
  assert.match(source,/clearTimeout\(reconnectTimer\)/)
 }
 assert.match(trace,/admin-trace-live-\$\{service\.id\}-\$\{channelEpoch\}/)
 assert.match(extended,/admin-extended-live-\$\{service\.id\}-\$\{channelEpoch\}/)
})


test('admin global realtime channel rebuilds on CLOSED, online and visibility recovery',async()=>{
 const src=await read('src/hooks/useAdminData.ts')
 assert.match(src,/status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'\|\|status==='CLOSED'/)
 assert.match(src,/addEventListener\('online', \(\) => resetRealtimeChannel\(\)\)/)
 assert.match(src,/addEventListener\('visibilitychange'/)
 assert.match(src,/document\.visibilityState === 'visible'/)
 assert.match(src,/Object\.values\(listeners\)\.forEach\(set => set\.forEach\(listener => listener\(\)\)\)/)
})


test('admin authenticates Realtime with the authorized session before mounting subscriptions',async()=>{
 const gate=await read('src/mvp/AdminGate.tsx')
 assert.match(gate,/await supabase\.realtime\.setAuth\(session\.access_token\)/)
 assert.match(gate,/if\(allowed\)\{setSessionActive\(false\);await supabase\.realtime\.setAuth\(session\.access_token\)\}/)
 // Realtime must be authenticated strictly after the role check, never before it.
 const authorize=gate.slice(gate.indexOf('async function authorizeSession'),gate.indexOf('async function verify'))
 assert.ok(authorize.indexOf('const allowed=')<authorize.indexOf('realtime.setAuth'),'ADMIN_REALTIME_AUTH_BEFORE_ROLE_CHECK')
})
