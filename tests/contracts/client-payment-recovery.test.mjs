import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/client/ClientPaymentChoice.tsx',import.meta.url),'utf8')

test('client payment realtime is scoped to the authenticated client',()=>{
 assert.match(source,/table:'pagos',filter:`cliente_id=eq\.\$\{session\.user\.id\}`/)
 assert.match(source,/table:'servicios',filter:`cliente_id=eq\.\$\{session\.user\.id\}`/)
})

test('client payment rehydrates persisted state after reconnect and visibility recovery',()=>{
 assert.match(source,/status==='SUBSCRIBED'/)
 assert.match(source,/addEventListener\('online',onOnline\)/)
 assert.match(source,/visibilityState==='visible'/)
})

test('ambiguous payment selection errors re-read persisted state before surfacing failure',()=>{
 assert.match(source,/seleccionar_pago_efectivo[\s\S]*if\(error\)\{await load\(\);throw error\}/)
 assert.match(source,/if\(!response\.ok\)\{await load\(\);throw new Error/)
})
