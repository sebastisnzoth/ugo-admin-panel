import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('provider acceptance reconciles the exact persisted opportunity after ambiguous rpc failure',()=>{
 assert.match(source,/persistedAcceptedOpportunity\(supabase:SupabaseClient,opportunityId:string,knownServiceId:string\|null\):Promise<boolean\|null>/)
 assert.match(source,/const serviceId=await opportunityServiceId\(supabase,id\)/)
 assert.match(source,/if\(error\)[\s\S]*const persisted=await persistedAcceptedOpportunity\(supabase,id,serviceId\)[\s\S]*if\(persisted===true\)return[\s\S]*throw error/)
})

test('provider acceptance retry treats the exact accepted service as source of truth',()=>{
 assert.match(source,/if\(!data\)[\s\S]*persistedAcceptedOpportunity\(supabase,id,serviceId\)[\s\S]*if\(persisted===true\)return[\s\S]*oportunidad ya no está disponible/i)
})

test('acceptance recovery cannot confuse another active assignment with the requested offer',()=>{
 assert.match(source,/from\('ofertas_servicio'\)[\s\S]*eq\('id',opportunityId\)[\s\S]*eq\('proveedor_id',userId\)/)
 assert.match(source,/persistedOffer\.estado!=='aceptada'/)
 assert.match(source,/serviceId=persistedOffer\.servicio_id/)
 assert.match(source,/from\('servicios'\)[\s\S]*eq\('id',serviceId\)[\s\S]*persistedService\.proveedor_id!==userId/)
 assert.doesNotMatch(source,/hasPersistedActiveAssignment/)
})

test('provider acceptance Sentinel only emits P0 after confirmed persistence failure',()=>{
 assert.match(source,/if\(persisted===false\)\{[\s\S]*severity:'P0'[\s\S]*action:'provider\.offer\.accept'/)
 assert.match(source,/provider_accept_offer_recovery_unverified[\s\S]*severity:'P1'[\s\S]*provider\.offer\.accept\.recovery/)
})
