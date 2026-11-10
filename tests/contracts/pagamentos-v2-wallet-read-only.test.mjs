import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasWalletReadOnlySandbox,parseAuthenticatedWallet } from '../../src/server/payments/asaasWalletReadOnlySandbox.mjs'
const issuer='b7f0bd20-06ee-4ce3-857c-c7868e8d071b'
test('wallet verification is GET-only on sandbox and never returns token',async()=>{
  const calls=[]
  const api=new AsaasWalletReadOnlySandbox({apiKey:'fake_secret',fetchImpl:async(url,init)=>{
    calls.push({url,init})
    return {ok:true,json:async()=>({data:[{walletId:issuer}]})}
  }})
  assert.deepEqual(await api.verifyIssuerWallet(issuer),{verified:true,environment:'sandbox',walletId:issuer})
  assert.equal(calls.length,1)
  assert.equal(calls[0].url,'https://api-sandbox.asaas.com/v3/wallets/')
  assert.equal(calls[0].init.method,'GET')
  assert.equal(calls[0].init.headers.access_token,'fake_secret')
  assert.equal(calls[0].init.body,undefined)
})
test('cannot verify a different account, malformed or ambiguous wallet response',()=>{
  assert.throws(()=>parseAuthenticatedWallet({data:[{walletId:'d87c890a-3c61-4ad1-a1d0-110fad62ae4e'}]},issuer),/differs/)
  assert.throws(()=>parseAuthenticatedWallet({data:[]},issuer),/Ambiguous/)
  assert.throws(()=>parseAuthenticatedWallet({data:[{walletId:issuer},{walletId:issuer}]},issuer),/Ambiguous/)
  assert.throws(()=>parseAuthenticatedWallet({data:[{}]},issuer),/Ambiguous/)
  assert.throws(()=>parseAuthenticatedWallet({data:[{walletId:issuer}]},'../bad'),/Invalid/)
})
test('network error does not leak secret',async()=>{
  const api=new AsaasWalletReadOnlySandbox({apiKey:'private_secret',fetchImpl:async()=>({ok:false,status:403})})
  await assert.rejects(api.verifyIssuerWallet(issuer),e=>e.message==='Asaas sandbox wallet verification failed (403)'&&!e.message.includes('private_secret'))
})
test('malformed issuer wallet cannot trigger API call',async()=>{
  let calls=0
  const api=new AsaasWalletReadOnlySandbox({apiKey:'fake_secret',fetchImpl:async()=>{calls++;throw Error('Unexpected')}})
  await assert.rejects(api.verifyIssuerWallet('invalid'))
  assert.equal(calls,0)
})
