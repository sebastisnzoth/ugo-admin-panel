import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider acceptance serializes by provider and allows only non-overlapping future bookings',async()=>{
 const migration=await read('supabase/migrations/20260913150500_provider_schedule_conflict_guard.sql')
 assert.match(migration,/for update of pp/i)
 assert.match(migration,/existing\.estado in \('en_camino','llegado','en_progreso','esperando_aprobacion','disputado'\)/)
 assert.match(migration,/existing\.estado = 'asignado'/)
 assert.match(migration,/existing\.programado_para < v_target_end \+ v_buffer/)
 assert.match(migration,/service_duration_minutes\(existing\.metadata\)/)
 assert.match(migration,/interval '30 minutes'/)
 assert.match(migration,/Ese horario se superpone con otro trabajo de tu agenda/)
 assert.match(migration,/Podés iniciar el traslado hasta 60 minutos antes/)
})

test('future scheduled assignments stay in agenda until they become actionable',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 assert.match(service,/ACTIONABLE_SCHEDULE_LEAD_MS=60\*60\*1000/)
 assert.match(service,/pickActionableProviderService/)
 assert.match(service,/LIVE_SERVICE_STATES/)
 assert.match(service,/service\.estado==='asignado'/)
 assert.match(service,/item\.time<=now\+ACTIONABLE_SCHEDULE_LEAD_MS/)
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
