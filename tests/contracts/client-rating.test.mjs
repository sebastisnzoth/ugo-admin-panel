import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client surfaces a persisted rating only after completed services',async()=>{
 const[prompt,surfaces]=await Promise.all([
  read('src/mvp/client/ClientRatingPrompt.tsx'),
  read('src/features/client/ui/ClientOperationalSurfaces.tsx'),
 ])
 assert.match(surfaces,/import\{ClientRatingPrompt\}from'\.\.\/\.\.\/\.\.\/mvp\/client\/ClientRatingPrompt'/)
 assert.match(surfaces,/<ClientRatingPrompt\/>/)
 assert.match(prompt,/from\('servicios'\)/)
 assert.match(prompt,/\.eq\('estado','completado'\)/)
 assert.match(prompt,/from\('resenas'\)/)
 assert.match(prompt,/cliente_id\s*:\s*userId/)
 assert.match(prompt,/proveedor_id\s*:\s*target\.service\.proveedor_id/)
 assert.match(prompt,/servicio_id\s*:\s*serviceId/)
 assert.match(prompt,/puntuacion\s*:\s*score/)
})

test('rating prompt offers 1-5 stars, optional comment and duplicate recovery',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 assert.match(prompt,/\[1,2,3,4,5\]\.map/)
 assert.match(prompt,/role="radiogroup"/)
 assert.match(prompt,/maxLength=\{500\}/)
 assert.match(prompt,/error\.code==='23505'/)
 assert.match(prompt,/Este servicio ya fue calificado\./)
 assert.match(prompt,/Enviar calificación/)
})

test('ambiguous rating insert failure reconciles exact persisted service before Sentinel',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 const insertIndex=prompt.indexOf("from('resenas').insert")
 const recoveryIndex=prompt.indexOf("from('resenas').select('id').eq('servicio_id',serviceId).eq('cliente_id',userId).eq('autor_tipo','cliente').maybeSingle()",insertIndex)
 const reportIndex=prompt.indexOf("report('rating_submit_error'",recoveryIndex)
 assert.ok(insertIndex>=0&&recoveryIndex>insertIndex&&reportIndex>recoveryIndex)
 assert.match(prompt,/if\(persisted\)\{markSaved\([\s\S]*return\}/)
})

test('unverified rating recovery is sync telemetry, not a confirmed submit failure',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 assert.match(prompt,/if\(recoveryError\)[\s\S]*rating_submit_recovery_unverified[\s\S]*return/)
 assert.match(prompt,/submit\?'client\.rating\.submit':'client\.rating\.sync'/)
 assert.match(prompt,/checklistCode:submit\?'RATING':undefined/)
 const unverifiedIndex=prompt.indexOf("rating_submit_recovery_unverified")
 const submitErrorIndex=prompt.indexOf("report('rating_submit_error'",unverifiedIndex)
 assert.ok(unverifiedIndex>=0&&submitErrorIndex>unverifiedIndex)
})

test('confirmed rating submit failures use server-classifiable Sentinel action',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 assert.match(prompt,/const text=error\.message\|\|'No se pudo guardar la calificación\.'/)
 assert.match(prompt,/report\('rating_submit_error',text,error,serviceId\)/)
})

test('rating prompt resyncs after lifecycle changes and reports foreground failures to Sentinel',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 assert.match(prompt,/table:'servicios'/)
 assert.match(prompt,/addEventListener\('online'/)
 assert.match(prompt,/visibilitychange/)
 assert.match(prompt,/SUBSCRIBED/)
 assert.match(prompt,/removeChannel/)
 assert.match(prompt,/const shouldEscalate=\(\)=>document\.visibilityState==='visible'&&navigator\.onLine/)
 assert.match(prompt,/loadRef=useRef\(load\),reportRef=useRef\(report\)/)
 assert.match(prompt,/\},\[serviceId,supabase,userId\]\)/)
 assert.match(prompt,/if\(shouldEscalate\(\)\)reportRef\.current\('rating_realtime_error'/)
})


test('ratings are bilateral: provider can rate the client and both directions share the same service',async()=>{
 const[prompt,root,migration]=await Promise.all([
  read('src/mvp/ProviderRatingPrompt.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('supabase/migrations/20260920030000_bilateral_service_ratings.sql'),
 ])
 assert.match(root,/ProviderRatingPrompt/)
 assert.match(prompt,/\.eq\('estado','completado'\)/)
 assert.match(prompt,/autor_tipo:'proveedor'/)
 assert.match(prompt,/cliente_id:target\.service\.cliente_id/)
 assert.match(prompt,/proveedor_id:userId/)
 assert.match(migration,/drop constraint if exists resenas_servicio_id_key/)
 assert.match(migration,/resenas_servicio_autor_tipo_uidx/)
 assert.match(migration,/autor_tipo='proveedor'/)
 assert.match(migration,/autor_tipo='cliente'/)
})


test('client rating is immediately available after payment closes the selected service',async()=>{
 const[surfaces,detail,prompt]=await Promise.all([
  read('src/features/client/ui/ClientOperationalSurfaces.tsx'),
  read('src/mvp/client/ClientServiceDetail.tsx'),
  read('src/mvp/client/ClientRatingPrompt.tsx'),
 ])
 assert.match(surfaces,/screen!=='request'&&!detailOpen&&<ClientRatingPrompt\/>/)
 assert.match(detail,/service\.estado==='completado'[\s\S]*<ClientRatingPrompt serviceId=\{service\.id\} embedded\/>/)
 assert.match(prompt,/serviceId\?servicesQuery\.eq\('id',serviceId\)\.limit\(1\)/)
 assert.match(prompt,/embedded\?'is-embedded'/)
})

test('completed-service notification can land on home and still expose client rating',async()=>{
 const[nav,flow,surfaces]=await Promise.all([
  read('src/features/client/navigation/clientNavigation.ts'),
  read('src/mvp/client/ClientFlowActionsBridge.tsx'),
  read('src/features/client/ui/ClientOperationalSurfaces.tsx'),
 ])
 assert.match(nav,/notice\.tipo==='servicio_completado'/)
 assert.match(flow,/openReview:\(\)=>navigate\('home'\)/)
 assert.match(surfaces,/screen!=='request'&&!detailOpen&&<ClientRatingPrompt\/>/)
})


test('provider rating recovers after realtime interruption and foreground resume',async()=>{
 const prompt=await read('src/mvp/ProviderRatingPrompt.tsx')
 assert.match(prompt,/channelEpoch/)
 assert.match(prompt,/loadRef/)
 assert.match(prompt,/addEventListener\('online'/)
 assert.match(prompt,/visibilitychange/)
 assert.match(prompt,/SUBSCRIBED/)
 assert.match(prompt,/CHANNEL_ERROR/)
 assert.match(prompt,/TIMED_OUT/)
 assert.match(prompt,/setChannelEpoch/)
 assert.match(prompt,/removeEventListener\('online'/)
 assert.match(prompt,/removeEventListener\('visibilitychange'/)
 assert.match(prompt,/removeChannel/)
})
