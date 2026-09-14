import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const payout=await readFile(new URL('../../src/mvp/ProviderPayoutPanel.tsx',import.meta.url),'utf8')
const clientHugo=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')
const chat=await readFile(new URL('../../src/mvp/ServiceChat.tsx',import.meta.url),'utf8')
const radarMigration=await readFile(new URL('../../supabase/migrations/20260914232234_provider_radar_security_invoker.sql',import.meta.url),'utf8')
const evidenceMigration=await readFile(new URL('../../supabase/migrations/20260914232954_service_evidence_storage_integrity_guard.sql',import.meta.url),'utf8')
const realtimeMigration=await readFile(new URL('../../supabase/migrations/20260914233726_enable_core_realtime_publication.sql',import.meta.url),'utf8')
const isolated=await readFile(new URL('../integration/client-provider-rpc-rls.test.mjs',import.meta.url),'utf8')

test('provider payout always uses the provider-scoped Supabase session',()=>{
 assert.match(payout,/getRoleSupabase\('provider'\)/)
 assert.doesNotMatch(payout,/from'\.\.\/lib\/supabase'/)
 assert.match(payout,/provider-payouts-/)
 assert.match(payout,/Authorization:`Bearer \$\{accessToken\}`/)
})

test('provider radar public view executes with caller privileges',()=>{
 assert.match(radarMigration,/alter view public\.proveedores_mapa set \(security_invoker = true\)/i)
})

test('client Hugo counts only valid pending offer enum values',()=>{
 assert.match(clientHugo,/eq\('estado','pendiente'\)/)
 assert.doesNotMatch(clientHugo,/enviada|ofrecida/)
})

test('service evidence rows require a real Storage object and the isolated harness uploads one',()=>{
 assert.match(evidenceMigration,/service_evidence_object_exists/)
 assert.match(evidenceMigration,/from storage\.objects/)
 assert.match(evidenceMigration,/bucket_id = 'service-evidence'/)
 assert.match(evidenceMigration,/private\.service_evidence_object_exists\(storage_path, usuario_id, servicio_id\)/)
 assert.match(isolated,/storage\.from\(EVIDENCE_BUCKET\)\.upload/)
 assert.match(isolated,/Una fila de evidencia sin objeto real en Storage debe ser rechazada/)
 assert.doesNotMatch(isolated,/storage_path: `integration\//)
})

test('core live surfaces are explicitly published to Supabase Realtime',()=>{
 for(const table of ['servicios','ofertas_servicio','pagos','evidencias_servicio','ampliaciones_servicio','mensajes','disputas','disputa_mensajes','perfiles_proveedor','notificaciones'])assert.match(realtimeMigration,new RegExp(`'${table}'`))
 assert.match(realtimeMigration,/alter publication supabase_realtime add table/)
})

test('service chat uses the canonical mensajes table and columns',()=>{
 assert.match(chat,/from\('mensajes'\)/)
 assert.match(chat,/table:'mensajes'/)
 assert.match(chat,/emisor_id:userId/)
 assert.match(chat,/contenido:text/)
 assert.doesNotMatch(chat,/mensajes_servicio/)
})
