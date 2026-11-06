import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyAsaasWebhookToken, parseAsaasPaymentEvent } from '../../src/server/payments/asaasWebhookGuard.mjs'
const token = 'example_sandbox_webhook_token_1234567890'
test('sandbox webhook token uses constant-time comparison of digests', () => {
  assert.equal(verifyAsaasWebhookToken(token,token),true)
  assert.equal(verifyAsaasWebhookToken(token+'bad',token),false)
  assert.equal(verifyAsaasWebhookToken('short',token),false)
  assert.equal(verifyAsaasWebhookToken(undefined,token),false)
})
test('webhook extracts only IDs and never treats event as payment confirmation', () => {
  assert.deepEqual(parseAsaasPaymentEvent({id:'evt_123&special',event:'PAYMENT_RECEIVED',payment:{id:'pay_123',value:200}}),
    {eventId:'evt_123&special',kind:'PAYMENT_RECEIVED',externalPaymentId:'pay_123'})
})
test('untrusted webhook values cannot inject malicious IDs', () => {
  for(const value of [null,{}, {id:'',event:'PAYMENT_RECEIVED',payment:{id:'pay_1'}},
    {id:'evt_1',event:'PAYMENT_RECEIVED',payment:{id:'../admin'}},
    {id:'evt_1',event:'PAYMENT_RECEIVED',payment:null}])
    assert.throws(()=>parseAsaasPaymentEvent(value))
})
