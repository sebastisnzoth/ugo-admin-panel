import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client matching can continue in background without trapping or blocking another request',async()=>{
 const source=await read('src/features/client/request/ClientPostConfirmFlow.tsx')
 assert.match(source,/const continueBackground=\(\)=>\{if\(service\)clearDraft\(\);onExit\(\)\}/)
 assert.match(source,/onClick=\{continueBackground\}>Seguir usando UGO/)
 assert.match(source,/Reintentar pedido/)
 assert.match(source,/Cancelar pedido/)
 assert.match(source,/flow\.actions\.cancelService\(service\.id\)/)
 assert.doesNotMatch(source,/hasActive/)
 assert.doesNotMatch(source,/Ya tenés un servicio en curso/)
})

test('scheduled request cannot continue with a past local datetime',async()=>{
 const source=await read('src/features/client/request/ClientWhenScreen.tsx')
 assert.match(source,/new Date\(scheduleAt\)\.getTime\(\)<=Date\.now\(\)/)
 assert.match(source,/min=\{localValue\(new Date\(\)\)\}/)
 assert.match(source,/Elegí una fecha y hora futura/)
})
