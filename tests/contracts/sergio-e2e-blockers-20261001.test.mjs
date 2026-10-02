import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider realtime rebuilds after foreground recovery',async()=>{
 const src=await read('src/mvp/provider/useProviderRealtime.ts')
 assert.match(src,/visibilityState==='visible'\)\{resync\(\);reconnect\(\)\}/)
 assert.match(src,/CHANNEL_ERROR.*TIMED_OUT.*CLOSED/)
 assert.match(src,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'\)resync\(\)\},20_000\)/)
 assert.match(src,/addEventListener\('focus',onFocus\)/)
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

test('provider Hugo visual surface stays detached from provider root',async()=>{
 const[root,bridge]=await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'),read('src/mvp/provider/ProviderHugoBridge.tsx')])
 assert.doesNotMatch(root,/ProviderHugoBridge/)
 assert.doesNotMatch(root,/ConversationalOrb/)
 assert.match(bridge,/PROVIDER_VOICE_CONNECT_TIMEOUT_MS=16_000/)
})

test('client Hugo visual surface stays detached from client root',async()=>{
 const[root,dock]=await Promise.all([read('src/features/client/ClientRoot.tsx'),read('src/features/client/hugo/ClientVoiceHugoDock.tsx')])
 assert.doesNotMatch(root,/ClientVoiceHugoDock/)
 assert.doesNotMatch(root,/ClientHugoBridge/)
 assert.match(dock,/clientRequestPhoto/)
 assert.match(dock,/ahora sacá una foto de lo que hay que arreglar/)
})

test('provider offer insert is an independent realtime alert source with dedupe',async()=>{
 const src=await read('src/mvp/NotificationCenter.tsx')
 assert.match(src,/table:'ofertas_servicio',filter:`proveedor_id=eq\.\$\{id\}`/)
 assert.match(src,/signalProviderAlert\(\{id:`offer:\$\{offerId\}`,tipo:'nueva_oferta'/)
 assert.match(src,/function providerAlertKey\(notice:UgoNotification\)/)
 assert.match(src,/providerAlertSeen\.current\.has\(providerAlertKey\(notice\)\)/)
})
