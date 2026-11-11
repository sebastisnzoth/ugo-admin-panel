import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyAuthenticatedPaidSplit} from '../../src/server/payments/asaasPaidSplitVerification.mjs'
import {AsaasPixQrSandbox} from '../../src/server/payments/asaasPixQrSandbox.mjs'

const splitId='064a4957-1eee-4d06-9c96-deaf8a17534d'
const walletId='ab5b5a59-f2eb-40eb-8b8b-bb7314685a33'
const expected={splitId,providerWalletId:walletId,paymentId:'pay_100',providerShareBps:8500,netCents:9800}
const paid={id:splitId,walletId,payment:{id:'pay_100'},percentualValue:85,status:'DONE',totalValue:83.30}
test('paid split only settles after exact processor identity, wallet, rate and net amount',()=>{
 const result=verifyAuthenticatedPaidSplit({response:paid,expected})
 assert.deepEqual(result,{kind:'settled',status:'DONE',netAmountCents:8330,splitSettled:true,escrowAvailable:false})
})
test('payment confirmation never substitutes for separately authenticated split settlement',()=>{
 for(const status of ['PENDING','AWAITING_CREDIT']){
  const r=verifyAuthenticatedPaidSplit({response:{...paid,status},expected})
  assert.equal(r.splitSettled,false)
 }
 for(const status of ['REFUNDED','REFUSED','CANCELLED']){
  const r=verifyAuthenticatedPaidSplit({response:{...paid,status},expected})
  assert.equal(r.kind,'review')
  assert.equal(r.splitSettled,false)
 }
})
test('no split settlement on foreign wallet, foreign payment, fake amount or missing processor evidence',()=>{
 for(const patch of [
  {id:'64e8b366-903f-4112-aaff-da2220df0b62'},
  {walletId:'64e8b366-903f-4112-aaff-da2220df0b62'},
  {payment:{id:'pay_foreign'}},{percentualValue:15},
  {totalValue:83.29},{totalValue:83.31},{totalValue:undefined},
  {status:'UNKNOWN'},
 ]){
  assert.throws(()=>verifyAuthenticatedPaidSplit({response:{...paid,...patch},expected}))
 }
})
test('Asaas paid split endpoint is a read-only sandbox GET with validated ID',async()=>{
 const calls=[]
 const api=new AsaasPixQrSandbox({apiKey:'sandbox_test',fetchImpl:async(url,init)=>{
   calls.push({url,init})
   return {ok:true,json:async()=>paid}
 }})
 assert.deepEqual(await api.getPaidSplit(splitId),paid)
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,'https://api-sandbox.asaas.com/v3/payments/splits/paid/'+splitId)
 assert.equal(calls[0].init.method,'GET')
 assert.equal(calls[0].init.body,undefined)
 await assert.rejects(api.getPaidSplit('../bad'),/Invalid splitId/)
 assert.equal(calls.length,1)
})
