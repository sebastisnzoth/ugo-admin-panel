import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/client/ClientPaymentChoice.tsx',import.meta.url),'utf8')

test('client payment realtime scopes selected service and preserves authenticated-client fallback',()=>{
 assert.match(source,/serviceFilter=serviceId\?`id=eq\.\$\{serviceId\}`:`cliente_id=eq\.\$\{session\.user\.id\}`/)
 assert.match(source,/paymentFilter=serviceId\?`servicio_id=eq\.\$\{serviceId\}`:`cliente_id=eq\.\$\{session\.user\.id\}`/)
})

test('client payment rehydrates persisted state after reconnect and visibility recovery',()=>{
 assert.match(source,/status==='SUBSCRIBED'/)
 assert.match(source,/addEventListener\('online',onOnline\)/)
 assert.match(source,/visibilityState==='visible'/)
})

test('ambiguous cash selection re-reads persisted state before surfacing failure',()=>{
 assert.match(source,/paymentMethodPersisted\(method:'efectivo'\|'pix'\):Promise<boolean\|null>/)
 assert.match(source,/seleccionar_pago_efectivo[\s\S]*const persisted=await paymentMethodPersisted\('efectivo'\)/)
 assert.match(source,/if\(persisted===true\)\{[\s\S]*Efectivo seleccionado[\s\S]*await load\(\);return\}/)
})

test('ambiguous Pix generation re-reads persisted state once before Sentinel escalation',()=>{
 assert.match(source,/if\(!response\.ok\)throw new Error/)
 assert.match(source,/catch\(e\)\{const persisted=await paymentMethodPersisted\('pix'\)/)
 assert.match(source,/if\(persisted===true\)\{[\s\S]*Pix generado[\s\S]*await load\(\);return\}/)
 const reporterCalls=(source.match(/reportPaymentFailure\(e,'pix',persisted\)/g)||[]).length
 assert.equal(reporterCalls,1)
})

test('payment Sentinel declares P0 only when persistence check confirms failure',()=>{
 assert.match(source,/const confirmed=persisted===false/)
 assert.match(source,/severity:confirmed\?'P0':'P1'/)
 assert.match(source,/action:confirmed\?'client\.order\.payment':'client\.order\.payment\.recovery'/)
 assert.match(source,/checklistCode:confirmed\?'PAYMENT-CLOSE':undefined/)
})
