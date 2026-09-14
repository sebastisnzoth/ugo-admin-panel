import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const payout=await readFile(new URL('../../src/mvp/ProviderPayoutPanel.tsx',import.meta.url),'utf8')
const clientHugo=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')
const migration=await readFile(new URL('../../supabase/migrations/20260914232234_provider_radar_security_invoker.sql',import.meta.url),'utf8')

test('provider payout always uses the provider-scoped Supabase session',()=>{
 assert.match(payout,/getRoleSupabase\('provider'\)/)
 assert.doesNotMatch(payout,/from'\.\.\/lib\/supabase'/)
 assert.match(payout,/provider-payouts-/)
 assert.match(payout,/Authorization:`Bearer \$\{accessToken\}`/)
})

test('provider radar public view executes with caller privileges',()=>{
 assert.match(migration,/alter view public\.proveedores_mapa set \(security_invoker = true\)/i)
})

test('client Hugo counts only valid pending offer enum values',()=>{
 assert.match(clientHugo,/eq\('estado','pendiente'\)/)
 assert.doesNotMatch(clientHugo,/enviada|ofrecida/)
})
