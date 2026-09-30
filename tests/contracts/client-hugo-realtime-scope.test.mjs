import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client Hugo realtime listens only to the current client and tracked services',async()=>{
 const source=await read('src/features/client/hugo/ClientHugoBridge.tsx')
 assert.match(source,/table:'servicios',filter:`cliente_id=eq\.\$\{session\.user\.id\}`/)
 assert.match(source,/table:'pagos',filter:`cliente_id=eq\.\$\{session\.user\.id\}`/)
 assert.match(source,/table:'ofertas_servicio',filter:`servicio_id=eq\.\$\{serviceId\}`/)
 assert.doesNotMatch(source,/table:'ofertas_servicio'\},\(\)=>void load\(\)/)
 assert.doesNotMatch(source,/table:'pagos'\},\(\)=>void load\(\)/)
})
