import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client home requires a persisted payment method before starting a service request',async()=>{
 const [home,payment]=await Promise.all([
  read('src/mvp/client/ClientHomeScreen.tsx'),
  read('src/mvp/client/ClientPreOrderPayment.tsx'),
 ])
 assert.match(home,/<ClientPreOrderPayment/)
 assert.match(home,/if\(!paymentReady\|\|!paymentMethod\)/)
 assert.match(home,/UGO no busca ningún profesional hasta que la forma de pago quede guardada/)
 assert.match(payment,/useState<Method\|null>\(null\)/)
 assert.doesNotMatch(payment,/useState<Method>\('efectivo'\)/)
 assert.match(payment,/set_preorder_payment_preference/)
})

test('backend rejects service creation without a pre-order payment preference',async()=>{
 const sql=await read('supabase/migrations/20260917150500_require_preorder_payment_preference.sql')
 assert.match(sql,/if v_metodo is null then/)
 assert.match(sql,/Elegí una forma de pago antes de crear el pedido/)
 assert.match(sql,/requested_payment_method/)
 assert.match(sql,/payment_selected_before_order/)
})
