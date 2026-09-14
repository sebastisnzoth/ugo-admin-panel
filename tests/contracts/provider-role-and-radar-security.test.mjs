import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const payout=await readFile(new URL('../../src/mvp/ProviderPayoutPanel.tsx',import.meta.url),'utf8')
const clientHugo=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')
const radarMigration=await readFile(new URL('../../supabase/migrations/20260914232234_provider_radar_security_invoker.sql',import.meta.url),'utf8')
const evidenceMigration=await readFile(new URL('../../supabase/migrations/20260914232954_service_evidence_storage_integrity_guard.sql',import.meta.url),'utf8')
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
