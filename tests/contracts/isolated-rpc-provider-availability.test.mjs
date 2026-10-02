import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('isolated lifecycle explicitly activates provider availability before directed matching',async()=>{
 const source=await readFile('tests/integration/client-provider-rpc-rls.test.mjs','utf8')
 const activate=source.indexOf("p.rpc('activar_disponibilidad_proveedor'")
 const matching=source.indexOf("c.rpc('iniciar_matching_dirigido'")
 assert.ok(activate>=0,'integration must activate provider availability')
 assert.ok(matching>activate,'provider must be online with fresh GPS before directed matching')
 assert.match(source,/staleClientHarnessServices/)
 assert.match(source,/fixture_failed_cleanup_at/)
})
