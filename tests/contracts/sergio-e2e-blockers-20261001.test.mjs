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
 assert.match(src,/role==='provider'\)signalProviderAlert\(notice\);else signalClientAlert\(notice\)/)
 assert.match(src,/resync\(\)/)
})

test('provider dispatch accepts payment method already persisted on the service',async()=>{
 const src=await read('src/mvp/provider/providerData.tsx')
 assert.match(src,/paymentPreferenceSelected=Boolean\(service&&\['efectivo','pix'\]\.includes\(effectivePaymentMethod\)\)/)
 assert.doesNotMatch(src,/paymentPreferenceSelected=Boolean\(service&&!amountReady/)
})

test('provider Hugo fails fast instead of hanging forever',async()=>{
 const src=await read('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(src,/setTimeout\(\(\)=>/)
 assert.match(src,/,9000\)/)
 assert.match(src,/Hugo no pudo conectar con el servicio de voz/)
})
