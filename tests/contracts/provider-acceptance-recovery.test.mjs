import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('provider acceptance reconciles persisted service after ambiguous rpc failure',()=>{
 assert.match(source,/acceptedServiceAfterAmbiguousError/)
 assert.match(source,/if\(error\)[\s\S]*acceptedServiceAfterAmbiguousError\(supabase,id\)[\s\S]*throw error/)
})

test('provider acceptance retry treats persisted assignment as source of truth',()=>{
 assert.match(source,/if\(!data\)[\s\S]*acceptedServiceAfterAmbiguousError\(supabase,id\)[\s\S]*oportunidad ya no está disponible/)
})

test('acceptance reconciliation reads offer service and persisted service state',()=>{
 assert.match(source,/from\('ofertas_servicio'\)\.select\('servicio_id'\)/)
 assert.match(source,/from\('servicios'\)\.select\('id,estado'\)/)
 assert.match(source,/PROVIDER_ACTIVE_STATES\.includes\(state\)/)
})
