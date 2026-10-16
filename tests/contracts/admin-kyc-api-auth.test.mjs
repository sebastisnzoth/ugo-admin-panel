import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('api/operations.ts','utf8')
const providerPanel=fs.readFileSync('src/mvp/AdminProviderVerificationPanel.tsx','utf8')

test('privileged KYC verification requires an authenticated active Admin',()=>{
 assert.match(source,/async function requireAdmin\(req: VercelRequest\)/)
 assert.match(source,/const token = accessToken\(req\)/)
 assert.match(source,/sb\.auth\.getUser\(token\)/)
 assert.match(source,/\.select\('tipo,activo'\)/)
 assert.match(source,/!profile\?\.activo \|\| !\['admin', 'superadmin'\]\.includes\(String\(profile\.tipo\)\)/)
 assert.match(source,/const \{ sb, user \} = await requireAdmin\(req\)/)
})

test('KYC reviewer identity comes from the authenticated Admin, never from request body',()=>{
 assert.doesNotMatch(source,/adminId/)
 assert.match(source,/revisor_id: user\.id/)
})

test('KYC approval validates its payload before privileged mutation',()=>{
 assert.match(source,/typeof aprobado !== 'boolean'/)
 assert.match(source,/documentoId\.trim\(\)/)
 assert.match(source,/notas\.trim\(\)\.slice\(0, 2000\)/)
})

test('provider verification uses the authenticated Admin API instead of a missing RPC',()=>{
 assert.match(source,/case 'provider-verification': return changeProviderVerification\(req, res\)/)
 assert.match(source,/PROVIDER_VERIFICATION_STATES = new Set\(\['pendiente', 'verificado', 'rechazado', 'suspendido'\]\)/)
 assert.match(source,/async function changeProviderVerification[\s\S]*const \{ sb, user \} = await requireAdmin\(req\)/)
 assert.match(source,/sb\.rpc\('admin_decide_provider_verification_atomic'/)
 assert.match(source,/p_actor_id: user\.id/)
 assert.doesNotMatch(providerPanel,/admin_cambiar_verificacion_proveedor/)
 assert.match(providerPanel,/supabase\.auth\.getSession\(\)/)
 assert.match(providerPanel,/operationsUrl\('provider-verification'\)/)
 assert.match(providerPanel,/Authorization:`Bearer \$\{token\}`/)
})

test('provider decisions enforce reasons and transaction-scoped audit',()=>{
 assert.match(source,/\['rechazado','suspendido'\]\.includes\(state\)/)
 assert.match(source,/p_provider_id: providerId/)
 const migration=fs.readFileSync('supabase/migrations/20261015224500_admin_atomic_provider_verification.sql','utf8')
 assert.match(migration,/insert into public\.audit_log/)
 assert.match(migration,/admin\.provider_verification\.update/)
 assert.match(migration,/PROVIDER_NOT_SUBMITTED_FOR_REVIEW/)
 assert.match(migration,/KYC_DOCUMENTS_NOT_APPROVED/)
 assert.match(migration,/comprobante_domicilio/)
 assert.match(migration,/security invoker/)
 assert.match(migration,/grant execute on function[\s\S]*to service_role/)
 assert.match(providerPanel,/state==='rechazado'\|\|state==='suspendido'/)
})
