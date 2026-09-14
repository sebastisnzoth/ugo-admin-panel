import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('materials reuse the canonical expansion approval and payment flow',async()=>{
 const panel=await read('src/mvp/ServiceExpansionPanel.tsx')
 const migration=await read('supabase/migrations/20260911_service_expansions.sql')
 assert.match(panel,/MATERIAL_PREFIX='Materiales · '/)
 assert.match(panel,/Pedir aprobación de materiales/)
 assert.match(panel,/No compres ni incorpores materiales cobrables sin aprobación/)
 assert.match(panel,/proponer_ampliacion_servicio/)
 assert.match(panel,/resolver_ampliacion_servicio/)
 assert.match(migration,/Sólo el cliente puede aprobar o rechazar la ampliación/)
 assert.match(migration,/monto_extra/)
})
