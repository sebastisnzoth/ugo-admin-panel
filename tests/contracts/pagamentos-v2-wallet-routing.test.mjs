import test from 'node:test'
import assert from 'node:assert/strict'
import { validateWalletRouting } from '../../src/server/payments/asaasWalletRouting.mjs'
const issuer='c4125b7d-fb92-4232-923a-01ab389a84f7'
const recipient='ab5b5a59-f2eb-40eb-8b8b-bb7314685a33'
const valid={
  issuerWalletId:issuer,issuerWalletVerified:true,providerWalletId:recipient,
  assignedProviderId:'pro_test',
  providerAccount:{providerId:'pro_test',walletId:recipient,environment:'sandbox',verified:true},
}
test('issuer wallet is excluded from provider split and verified provider wallet is permitted',()=>{
  assert.deepEqual(validateWalletRouting(valid),{providerWalletId:recipient,environment:'sandbox'})
})
test('the UGO wallet must never receive its own split',()=>{
  assert.throws(()=>validateWalletRouting({...valid,providerWalletId:issuer,
    providerAccount:{...valid.providerAccount,walletId:issuer}}),/issuer wallet/)
})
test('wallet must be processor verified, not accepted from untrusted frontend input',()=>{
  assert.throws(()=>validateWalletRouting({...valid,issuerWalletVerified:false}),/UGO wallet not verified/)
  assert.throws(()=>validateWalletRouting({...valid,providerAccount:{...valid.providerAccount,verified:false}}),/ownership not verified/)
  assert.throws(()=>validateWalletRouting({...valid,assignedProviderId:'attacker'}),/ownership not verified/)
})
test('production and malformed wallet values are forbidden',()=>{
  assert.throws(()=>validateWalletRouting({...valid,environment:'production'}),/sandbox/)
  assert.throws(()=>validateWalletRouting({...valid,providerWalletId:'../wallets'}),/Invalid provider/)
})
