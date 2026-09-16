import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const service=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('ambiguous provider offer rejection checks exact persisted offer first',()=>{
 assert.match(service,/persistedRejectedOpportunity\(supabase:SupabaseClient,opportunityId:string\)/)
 assert.match(service,/from\('ofertas_servicio'\)\.select\('estado'\)\.eq\('id',opportunityId\)\.eq\('proveedor_id',userId\)\.maybeSingle\(\)/)
 assert.match(service,/return data\.estado==='rechazada'/)
 assert.match(service,/if\(persisted===true\)return/)
})

test('confirmed rejection failure and unverified recovery have distinct Sentinel severity',()=>{
 assert.match(service,/persisted===false[\s\S]*provider_reject_offer_error[\s\S]*severity:'P1'/)
 assert.match(service,/provider_reject_offer_recovery_unverified/)
 assert.match(service,/severity:'P2'/)
 assert.match(service,/action:'provider\.offer\.reject\.recovery'/)
})
