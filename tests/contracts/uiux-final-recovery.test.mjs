import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=(path)=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client payment never hides a failed state load without recovery',async()=>{
 const src=await read('src/mvp/client/ClientPaymentChoice.tsx')
 assert.match(src,/setLoadError\('No pudimos actualizar la forma de pago/)
 assert.match(src,/role="alert"/)
 assert.match(src,/>Reintentar</)
 assert.match(src,/Conservamos el último estado conocido/)
})

test('provider active-job empty state has clear exits and consistent arrival copy',async()=>{
 const src=await read('src/mvp/provider/ProviderActiveJob.tsx')
 assert.match(src,/Ver oportunidades/)
 assert.match(src,/Explorar demanda/)
 assert.match(src,/Marcar que llegué/)
 assert.doesNotMatch(src,/Confirmar llegada/)
})

test('admin, client and provider expose final mobile recovery styles',async()=>{
 const admin=await read('src/mvp/admin-uiux-final.css')
 const payment=await read('src/mvp/client/client-payment-choice.css')
 const provider=await read('src/mvp/provider/provider-flow.css')
 assert.match(admin,/repeat\(6,minmax\(0,1fr\)\)/)
 assert.match(payment,/--ugo-touch-target/)
 assert.match(payment,/safe-area-inset-bottom/)
 assert.match(provider,/repeat\(5,minmax\(0,1fr\)\)/)
})
