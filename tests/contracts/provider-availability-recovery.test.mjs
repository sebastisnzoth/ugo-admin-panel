import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const service=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('ambiguous provider availability update reconciles persisted online state first',()=>{
 assert.match(service,/persistedProviderAvailability\(supabase:SupabaseClient,userId:string,online:boolean\)/)
 assert.match(service,/select\('disponible,online'\)[\s\S]*eq\('usuario_id',userId\)[\s\S]*maybeSingle\(\)/)
 assert.match(service,/data\.disponible===online&&data\.online===online/)
 assert.match(service,/if\(persisted===true\)return/)
})

test('availability Sentinel distinguishes confirmed failure from unverified recovery',()=>{
 assert.match(service,/persisted===false[\s\S]*provider_availability_error[\s\S]*checklistCode:'MATCH-ONLINE'/)
 assert.match(service,/provider_availability_recovery_unverified/)
 assert.match(service,/action:'provider\.availability\.recovery'/)
 assert.match(service,/severity:'P2'/)
})
