import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider agenda is mounted and scoped to the authenticated provider',async()=>{
 const[agenda,root]=await Promise.all([
  read('src/mvp/provider/ProviderAgenda.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
 ])
 assert.match(root,/import\{ProviderAgenda\}from'\.\/ProviderAgenda'/)
 assert.match(root,/screen==='agenda'&&<ProviderAgenda\/>/)
 assert.match(agenda,/from\('servicios'\)/)
 assert.match(agenda,/\.eq\('proveedor_id',id\)/)
 assert.doesNotMatch(agenda,/\.not\('programado_para','is',null\)/)
 assert.match(agenda,/\.in\('estado',AGENDA_STATES\)/)
 assert.match(agenda,/\.order\('programado_para',\{ascending:true,nullsFirst:true\}\)/)
})

test('provider agenda keeps each immediate or scheduled job isolated by serviceId',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/key=\{row\.id\}/)
 assert.match(agenda,/setSelectedId\(row\.id\)/)
 assert.match(agenda,/<ServiceChat role="provider" serviceId=\{selected\.id\} compact\/>/)
 assert.match(agenda,/Todos los cambios se aplican únicamente al serviceId/)
 assert.match(agenda,/advanceProviderService\(db,selected\.id,target\)/)
 assert.match(agenda,/cancelProviderService\(db,selected\.id,cancelReason\)/)
})

test('provider order detail exposes lifecycle evidence chat audit and cancellation',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 for(const label of ['ESTOY YENDO','YA LLEGUÉ','EMPEZAR TRABAJO','TRABAJO LISTO','REGISTRO DEL PEDIDO','No voy a poder realizar este pedido']) assert.match(agenda,new RegExp(label))
 assert.match(agenda,/ProviderEvidencePanel service=\{selectedService\} compact forceKind="antes"/)
 assert.match(agenda,/ProviderEvidencePanel service=\{selectedService\} compact forceKind="despues"/)
 assert.match(agenda,/servicio_estado_eventos/)
 assert.match(agenda,/cancelReason\.trim\(\)\.length<5/)
})

test('provider agenda exposes immediate, today and upcoming work without hiding unscheduled assignments',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/programado_para:string\|null/)
 assert.match(agenda,/if\(!value\)return'Atención inmediata'/)
 assert.match(agenda,/immediateRows=rows\.filter\(row=>!row\.programado_para/)
 assert.match(agenda,/todayRows=rows\.filter/)
 assert.match(agenda,/upcomingRows=rows\.filter/)
 assert.match(agenda,/>AHORA</)
 assert.match(agenda,/>HOY</)
 assert.match(agenda,/>PRÓXIMOS</)
 assert.match(agenda,/Mis trabajos/)
})

test('provider agenda resyncs from realtime and reports operational failures to Sentinel',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion']) assert.ok(agenda.includes(`'${state}'`),`missing agenda state ${state}`)
 assert.match(agenda,/table:'servicios',filter:`proveedor_id=eq\.\$\{id\}`/)
 assert.match(agenda,/status==='SUBSCRIBED'/)
 assert.match(agenda,/CHANNEL_ERROR/)
 assert.match(agenda,/TIMED_OUT/)
 assert.match(agenda,/removeChannel/)
 assert.match(agenda,/action:'provider\.agenda\.load'/)
 assert.match(agenda,/checklistCode:'PROVIDER-AGENDA'/)
 assert.match(agenda,/severity:'P1'/)
})
