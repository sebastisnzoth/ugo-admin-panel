import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider realtime rebuilds after foreground recovery',async()=>{
 const src=await read('src/mvp/provider/useProviderRealtime.ts')
 assert.match(src,/visibilityState==='visible'\)\{resync\(\);reconnect\(\)\}/)
 assert.match(src,/CHANNEL_ERROR.*TIMED_OUT.*CLOSED/)
})

test('realtime notification insert alerts immediately before reconciliation',async()=>{
 const src=await read('src/mvp/NotificationCenter.tsx')
 assert.match(src,/setRows\(current=>\[notice,/)
 assert.match(src,/role==='provider'&&!SERVICE_NOTICE_EXPECTED_STATE\[notice\.tipo\]\)signalProviderAlert\(notice\)/)
 assert.match(src,/resync\(\)/)
})

test('client payment choice reacts immediately while backend persistence completes',async()=>{
 const src=await read('src/features/client/payments/ClientPaymentChoice.tsx')
 assert.match(src,/optimisticMethod/)
 assert.match(src,/setOptimisticMethod\('efectivo'\)/)
 assert.match(src,/setOptimisticMethod\('pix'\)/)
 assert.match(src,/if\(persisted===false\)setOptimisticMethod\(''\)/)
})

test('provider Hugo fails fast instead of hanging forever',async()=>{
 const src=await read('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(src,/setTimeout\(\(\)=>/)
 assert.match(src,/,9000\)/)
 assert.match(src,/Hugo no pudo conectar con el servicio de voz/)
})

test('client voice guides optional repair photo and cannot hang on connect',async()=>{
 const src=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx')
 assert.match(src,/clientRequestPhoto/)
 assert.match(src,/ahora sacá una foto de lo que hay que arreglar/)
 assert.match(src,/Hugo no pudo conectar con el servicio de voz/)
 assert.match(src,/,9000\)/)
})
