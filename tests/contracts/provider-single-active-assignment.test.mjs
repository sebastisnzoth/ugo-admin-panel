import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider acceptance serializes by provider and rejects a second active assignment',async()=>{
 const migration=await read('supabase/migrations/20260913142500_provider_single_active_assignment_guard.sql')
 assert.match(migration,/for update of pp/i)
 assert.match(migration,/existing\.proveedor_id = v_uid/)
 assert.match(migration,/existing\.id <> v_servicio\.id/)
 assert.match(migration,/existing\.estado in \('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'\)/)
 assert.match(migration,/Ya tenés un trabajo activo\. Finalizalo antes de aceptar otro\./)
})

test('ambiguous provider acceptance only recovers the exact accepted opportunity',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 assert.match(service,/hasPersistedAcceptedOpportunity\(supabase:SupabaseClient,opportunityId:string\)/)
 assert.match(service,/from\('ofertas_servicio'\)[\s\S]*\.eq\('id',opportunityId\)[\s\S]*\.eq\('proveedor_id',userId\)/)
 assert.match(service,/persistedOffer\.estado!=='aceptada'/)
 assert.match(service,/from\('servicios'\)[\s\S]*\.eq\('id',persistedOffer\.servicio_id\)[\s\S]*\.eq\('proveedor_id',userId\)/)
 assert.match(service,/hasPersistedAcceptedOpportunity\(supabase,id\)/)
 assert.doesNotMatch(service,/hasPersistedActiveAssignment/)
})
