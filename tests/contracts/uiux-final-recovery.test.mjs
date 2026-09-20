import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=(path)=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client payment never hides a failed state load without recovery',async()=>{
 const src=await read('src/mvp/client/ClientPaymentChoice.tsx')
 assert.match(src,/const text='No pudimos actualizar la forma de pago/)
 assert.match(src,/setLoadError\(text\)/)
 assert.match(src,/role="alert"/)
 assert.match(src,/>Reintentar</)
 assert.match(src,/Conservamos el último estado conocido/)
 assert.match(src,/client_payment_state_sync_error/)
})

test('provider active-job empty state keeps one simple exit and arrival has automatic plus manual recovery',async()=>{
 const src=await read('src/mvp/provider/ProviderActiveJob.tsx')
 assert.match(src,/Ver pedidos/)
 assert.match(src,/UGO intenta detectar tu llegada automáticamente/)
 assert.match(src,/YA LLEGUÉ/)
 assert.doesNotMatch(src,/Confirmar llegada/)
})

test('admin, client and provider expose final mobile recovery styles',async()=>{
 const admin=await read('src/mvp/admin-uiux-final.css')
 const payment=await read('src/mvp/client/client-payment-choice.css')
 const provider=await read('src/mvp/provider/provider-flow.css')
 assert.match(admin,/display:flex!important;overflow-x:auto/)
 assert.match(admin,/flex:0 0 76px/)
 assert.match(payment,/--ugo-touch-target/)
 assert.match(payment,/safe-area-inset-bottom/)
 assert.match(provider,/repeat\(5,minmax\(0,1fr\)\)/)
})