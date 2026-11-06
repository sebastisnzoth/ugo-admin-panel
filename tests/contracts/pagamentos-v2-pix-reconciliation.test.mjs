import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileAuthenticatedPix } from '../../src/server/payments/asaasPixReconciliation.mjs'
const expected = {paymentId:'pay_1',serviceReference:'svc_1',customerId:'cus_1',amountBRL:100}
const base={id:'pay_1',externalReference:'svc_1',customer:'cus_1',billingType:'PIX',value:100,netValue:98.20,status:'RECEIVED'}
test('received Pix is reconciled in cents but DOES NOT claim split or escrow payout',()=>{
  assert.deepEqual(reconcileAuthenticatedPix({payment:base,expected}),{
    kind:'received',grossCents:10000,netCents:9820,splitSettled:false,escrowReleased:false
  })
})
test('pending and confirmed are not treated as settled or available',()=>{
  assert.deepEqual(reconcileAuthenticatedPix({payment:{...base,status:'PENDING'},expected}),{kind:'pending'})
  assert.deepEqual(reconcileAuthenticatedPix({payment:{...base,status:'CONFIRMED'},expected}),{kind:'confirmed_not_settled'})
})
test('refund or chargeback blocks credit',()=>{
  for(const status of ['REFUNDED','REFUND_REQUESTED','CHARGEBACK_REQUESTED'])
    assert.deepEqual(reconcileAuthenticatedPix({payment:{...base,status},expected}),{kind:'review',reason:'refund_or_chargeback'})
})
test('never trust mismatched payment id, customer, service, amount or method',()=>{
  for(const patch of [
    {id:'pay_other'},{customer:'cus_other'},{externalReference:'svc_other'},
    {billingType:'BOLETO'},{value:90},{netValue:101,status:'RECEIVED'},
    {status:'UNKNOWN_STATUS'},
  ]) assert.throws(()=>reconcileAuthenticatedPix({payment:{...base,...patch},expected}))
})
test('invalid expected payment metadata does not permit reconciling',()=>{
  assert.throws(()=>reconcileAuthenticatedPix({payment:base,expected:{...expected,amountBRL:0}}))
  assert.throws(()=>reconcileAuthenticatedPix({payment:null,expected}))
})
