import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client can start a request without configuring payment on Home',async()=>{
 const [home,need,payment,summary,profile]=await Promise.all([
  read('src/mvp/client/ClientHomeScreen.tsx'),
  read('src/mvp/client/ClientNeedScreen.tsx'),
  read('src/mvp/client/ClientPaymentScreen.tsx'),
  read('src/mvp/client/ClientSummaryScreen.tsx'),
  read('src/mvp/client/ClientProfilePanel.tsx'),
 ])
 assert.doesNotMatch(home,/ClientPreOrderPayment/)
 assert.doesNotMatch(home,/paymentReady|paymentWarning|Primero elegí cómo vas a pagar/)
 assert.doesNotMatch(need,/paymentAllowed|paymentChecked|Elegí una forma de pago en Inicio/)
 assert.match(payment,/useState<Method>\('cash'\)/)
 assert.match(payment,/Predeterminado · pagás al profesional/)
 assert.match(payment,/set_preorder_payment_preference/)
 assert.match(payment,/[Ll]a forma de pago nunca bloquea que empieces el pedido/)
 assert.match(summary,/d\.paymentMethod==='pix'\?'PIX · se confirma con el profesional asignado':'Efectivo · pagás al finalizar'/)
 assert.match(profile,/Forma de pago/)
 assert.match(profile,/Efectivo/)
 assert.match(profile,/Nunca bloquea que empieces a solicitar un servicio/)
})

test('backend defaults to cash instead of rejecting service creation',async()=>{
 const [sql,postConfirm,paymentChoice]=await Promise.all([
  read('supabase/migrations/20260917230000_default_cash_nonblocking_preorder.sql'),
  read('src/mvp/client/ClientPostConfirmFlow.tsx'),
  read('src/features/client/payments/ClientPaymentChoice.tsx'),
 ])
 assert.match(sql,/v_metodo := 'efectivo'/)
 assert.match(sql,/payment_preference_source/)
 assert.match(sql,/default_cash/)
 assert.doesNotMatch(sql,/Elegí una forma de pago antes de crear el pedido/)
 assert.match(postConfirm,/payment_method:draft\.paymentMethod==='pix'\?'pix':'efectivo'/)
 assert.match(paymentChoice,/seleccionar_pago_efectivo/)
 assert.match(paymentChoice,/requested_payment_method/)
})
