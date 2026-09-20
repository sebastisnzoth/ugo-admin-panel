import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider acceptance serializes and permits non-overlapping future bookings during live work',async()=>{
 const migration=await read('supabase/migrations/20260920154000_provider_future_jobs_during_live_work.sql')
 assert.match(migration,/for update of pp/i)
 assert.match(migration,/existing\.estado in \('en_camino','llegado','en_progreso'\)/)
 assert.doesNotMatch(migration,/existing\.estado in \('en_camino','llegado','en_progreso','esperando_aprobacion','disputado'\)/)
 assert.match(migration,/Podés aceptar otro si está programado para más adelante/)
 assert.match(migration,/v_target_start < \(/)
 assert.match(migration,/service_duration_minutes\(existing\.metadata\)/)
 assert.match(migration,/interval '30 minutes'/)
 assert.match(migration,/Ese horario queda demasiado cerca del trabajo que estás haciendo/)
 assert.match(migration,/Ese horario se superpone con otro trabajo de tu agenda/)
})

test('future scheduled assignments stay in agenda until they become actionable',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 assert.match(service,/ACTIONABLE_SCHEDULE_LEAD_MS=60\*60\*1000/)
 assert.match(service,/pickActionableProviderService/)
 assert.match(service,/MISSION_SERVICE_STATES/)
 assert.match(service,/PASSIVE_SERVICE_STATES/)
 assert.match(service,/service\.estado==='asignado'/)
 assert.match(service,/item\.time<=now\+ACTIONABLE_SCHEDULE_LEAD_MS/)
 const mission=service.indexOf('MISSION_SERVICE_STATES.has(service.estado)')
 const scheduled=service.indexOf('item.time<=now+ACTIONABLE_SCHEDULE_LEAD_MS')
 const passive=service.indexOf('PASSIVE_SERVICE_STATES.has(service.estado)')
 assert.ok(mission>=0&&scheduled>mission&&passive>scheduled)
 assert.match(service,/\.limit\(50\)/)
})

test('ambiguous provider acceptance only recovers the exact requested service',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 assert.match(service,/persistedAcceptedOpportunity\(supabase:SupabaseClient,opportunityId:string,knownServiceId:string\|null\):Promise<boolean\|null>/)
 assert.match(service,/const serviceId=await opportunityServiceId\(supabase,id\)/)
 assert.match(service,/from\('ofertas_servicio'\)[\s\S]*\.eq\('id',opportunityId\)[\s\S]*\.eq\('proveedor_id',userId\)/)
 assert.match(service,/persistedOffer\.estado!=='aceptada'/)
 assert.match(service,/serviceId=persistedOffer\.servicio_id/)
 assert.match(service,/from\('servicios'\)[\s\S]*\.eq\('id',serviceId\)[\s\S]*persistedService\.proveedor_id!==userId/)
 assert.match(service,/persistedAcceptedOpportunity\(supabase,id,serviceId\)/)
 assert.doesNotMatch(service,/hasPersistedActiveAssignment/)
})


test('provider opportunity copy never promises an acceptance that backend may reject',async()=>{
 const screen=await read('src/mvp/provider/ProviderOpportunities.tsx')
 assert.match(screen,/UGO validará que este horario no se superponga/)
 assert.match(screen,/no tiene un horario futuro confirmado/)
 assert.doesNotMatch(screen,/Podés aceptar este también: UGO lo agrega a tu agenda/)
})
