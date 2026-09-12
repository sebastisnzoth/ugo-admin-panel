import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('provider acceptance reconciles persisted assignment after ambiguous rpc failure',()=>{
 assert.match(source,/hasPersistedActiveAssignment/)
 assert.match(source,/if\(error\)[\s\S]*hasPersistedActiveAssignment\(supabase\)[\s\S]*throw error/)
})

test('provider acceptance retry treats persisted assignment as source of truth',()=>{
 assert.match(source,/if\(!data\)[\s\S]*hasPersistedActiveAssignment\(supabase\)[\s\S]*oportunidad ya no está disponible/)
})

test('acceptance recovery does not depend on stale offer visibility',()=>{
 assert.doesNotMatch(source,/from\('ofertas_servicio'\)\.select\('servicio_id'\)/)
 assert.match(source,/auth\.getUser\(\)/)
 assert.match(source,/eq\('proveedor_id',userId\)/)
 assert.match(source,/in\('estado',PROVIDER_ACTIVE_STATES\)/)
})
