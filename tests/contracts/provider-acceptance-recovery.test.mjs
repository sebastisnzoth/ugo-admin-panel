import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('provider acceptance reconciles the exact persisted opportunity after ambiguous rpc failure',()=>{
 assert.match(source,/hasPersistedAcceptedOpportunity/)
 assert.match(source,/if\(error\)[\s\S]*hasPersistedAcceptedOpportunity\(supabase,id\)[\s\S]*throw error/)
})

test('provider acceptance retry treats the exact accepted offer as source of truth',()=>{
 assert.match(source,/if\(!data\)[\s\S]*hasPersistedAcceptedOpportunity\(supabase,id\)[\s\S]*oportunidad ya no está disponible/)
})

test('acceptance recovery cannot confuse another active assignment with the requested offer',()=>{
 assert.match(source,/from\('ofertas_servicio'\)[\s\S]*eq\('id',opportunityId\)[\s\S]*eq\('proveedor_id',userId\)/)
 assert.match(source,/persistedOffer\.estado!=='aceptada'/)
 assert.match(source,/from\('servicios'\)[\s\S]*eq\('id',persistedOffer\.servicio_id\)[\s\S]*eq\('proveedor_id',userId\)/)
 assert.doesNotMatch(source,/hasPersistedActiveAssignment/)
})
