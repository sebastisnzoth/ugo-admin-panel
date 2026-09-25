import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client rating lives behind the feature boundary',async()=>{
 const[canonical,legacyCss]=await Promise.all([
  read('src/features/client/rating/ClientRatingPrompt.tsx'),
  read('src/mvp/client/client-rating-prompt.css'),
 ])
 assert.match(canonical,/import'.\/clientRatingPrompt\.css'/)
 assert.match(legacyCss,/features\/client\/rating\/clientRatingPrompt\.css/)
})

test('bilateral rating mutation is centralized and service-scoped',async()=>{
 const[client,provider,boundary]=await Promise.all([
  read('src/features/client/rating/ClientRatingPrompt.tsx'),
  read('src/mvp/ProviderRatingPrompt.tsx'),
  read('src/features/ratings/serviceRatingService.ts'),
 ])
 assert.match(client,/submitServiceRating\(supabase,\{userId,role:'client',serviceId,score,comment\}\)/)
 assert.match(provider,/submitServiceRating\(supabase,\{userId,role:'provider',serviceId,score,comment\}\)/)
 assert.doesNotMatch(client,/from\('resenas'\)\.insert/)
 assert.doesNotMatch(provider,/from\('resenas'\)\.insert/)
 assert.match(boundary,/\.eq\('id',serviceId\)\.eq\(owner,userId\)\.maybeSingle\(\)/)
 assert.match(boundary,/row\.estado!=='completado'/)
 assert.match(boundary,/servicio_id:service\.id,cliente_id:service\.cliente_id,proveedor_id:service\.proveedor_id/)
 assert.match(boundary,/autor_tipo:authorType\(role\)/)
})

test('rating boundary is idempotent and reconciles ambiguous inserts',async()=>{
 const boundary=await read('src/features/ratings/serviceRatingService.ts')
 assert.match(boundary,/readExistingRating\(supabase,service,role\)/)
 assert.match(boundary,/sameRating\(existing/)
 assert.match(boundary,/status:'already_rated'/)
 assert.match(boundary,/const\{error\}=await supabase\.from\('resenas'\)\.insert\(payload\)/)
 assert.match(boundary,/reconciled:true/)
 assert.match(boundary,/recovery_unverified/)
})

test('rating prompt offers 1-5 stars and an optional bounded comment',async()=>{
 const prompt=await read('src/features/client/rating/ClientRatingPrompt.tsx')
 assert.match(prompt,/\[1,2,3,4,5\]\.map/)
 assert.match(prompt,/role="radiogroup"/)
 assert.match(prompt,/maxLength=\{500\}/)
 assert.match(prompt,/Enviar calificación/)
})

test('client rating telemetry separates unverified recovery from confirmed submit failure',async()=>{
 const prompt=await read('src/features/client/rating/ClientRatingPrompt.tsx')
 assert.match(prompt,/ServiceRatingError&&error\.code==='recovery_unverified'/)
 assert.match(prompt,/rating_submit_recovery_unverified/)
 assert.match(prompt,/report\('rating_submit_error'/)
})

test('client rating resyncs after lifecycle changes and reports foreground failures to Sentinel',async()=>{
 const prompt=await read('src/features/client/rating/ClientRatingPrompt.tsx')
 assert.match(prompt,/table:'servicios'/)
 assert.match(prompt,/addEventListener\('online'/)
 assert.match(prompt,/visibilitychange/)
 assert.match(prompt,/SUBSCRIBED/)
 assert.match(prompt,/removeChannel/)
 assert.match(prompt,/const shouldEscalate=\(\)=>document\.visibilityState==='visible'&&navigator\.onLine/)
})

test('ratings are bilateral and protected by participant-completed RLS',async()=>{
 const[provider,root,migration,boundary]=await Promise.all([
  read('src/mvp/ProviderRatingPrompt.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('supabase/migrations/20260920030000_bilateral_service_ratings.sql'),
  read('src/features/ratings/serviceRatingService.ts'),
 ])
 assert.match(root,/ProviderRatingPrompt/)
 assert.match(provider,/role:'provider'/)
 assert.match(boundary,/authorType=\(role:RatingRole\)=>role==='client'\?'cliente':'proveedor'/)
 assert.match(migration,/resenas_servicio_autor_tipo_uidx/)
 assert.match(migration,/s\.estado='completado'/)
 assert.match(migration,/s\.cliente_id=resenas\.cliente_id/)
 assert.match(migration,/s\.proveedor_id=resenas\.proveedor_id/)
})

test('client rating is immediately available after payment closes the selected service',async()=>{
 const[surfaces,detail,prompt]=await Promise.all([
  read('src/features/client/ui/ClientOperationalSurfaces.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/features/client/rating/ClientRatingPrompt.tsx'),
 ])
 assert.match(surfaces,/screen!=='request'&&!detailOpen&&<ClientRatingPrompt\/>/)
 assert.match(detail,/service\.estado==='completado'[\s\S]*<ClientRatingPrompt serviceId=\{service\.id\} embedded\/>/)
 assert.match(prompt,/serviceId\?servicesQuery\.eq\('id',serviceId\)\.limit\(1\)/)
 assert.match(prompt,/embedded\?'is-embedded'/)
})

test('completed-service notification opens its exact service before falling back to generic review',async()=>{
 const[nav,detail,prompt]=await Promise.all([
  read('src/features/client/navigation/clientNavigation.ts'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/features/client/rating/ClientRatingPrompt.tsx'),
 ])
 assert.match(nav,/const serviceId=typeof notice\.datos\?\.servicio_id==='string'/)
 assert.match(nav,/if\(serviceId\)return\{kind:'service',serviceId\}/)
 assert.match(nav,/if\(notice\.tipo==='servicio_completado'\)return\{kind:'review'\}/)
 assert.match(detail,/service\.estado==='completado'[\s\S]*<ClientRatingPrompt serviceId=\{service\.id\} embedded\/>/)
 assert.match(prompt,/serviceId\?servicesQuery\.eq\('id',serviceId\)\.limit\(1\)/)
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
