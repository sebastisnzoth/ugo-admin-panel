import test from 'node:test'
import assert from 'node:assert/strict'
import {assessProviderAsaasSetup,assessProviderAsaasWallet} from '../../src/server/payments/asaasSubaccountEligibility.mjs'

const parent={registrationType:'CNPJ',verified:true,subaccountsEnabled:true,creationFeesReviewed:true}
const provider={ugoProviderId:'provider_1',authenticated:true,consentToAsaas:true,kycReady:true}
const account={ugoProviderId:'provider_1',environment:'sandbox',walletId:'b7f0bd20-06ee-4ce3-857c-c7868e8d071b',verified:true,kycApproved:true}

test('no subaccount creation with parent personal CPF account',()=>{
 const r=assessProviderAsaasSetup({parent:{...parent,registrationType:'CPF'},provider})
 assert.equal(r.canCreateSubaccount,false)
 assert.ok(r.blockers.includes('PARENT_CNPJ_REQUIRED'))
})
test('even with a CNPJ, explicit costs, permissions and provider consent are required',()=>{
 const r=assessProviderAsaasSetup({parent:{...parent,creationFeesReviewed:false,subaccountsEnabled:false},
  provider:{...provider,consentToAsaas:false}})
 assert.equal(r.canCreateSubaccount,false)
 for(const item of ['COST_APPROVAL_REQUIRED','SUBACCOUNTS_NOT_ENABLED','PROVIDER_CONSENT_REQUIRED'])
  assert.ok(r.blockers.includes(item))
})
test('complete verified sandbox eligibility is permitted, without triggering a request',()=>{
 assert.deepEqual(assessProviderAsaasSetup({parent,provider}),{canCreateSubaccount:true,blockers:[]})
})
test('provider receives split only after wallet ownership and KYC',()=>{
 assert.equal(assessProviderAsaasWallet({account,providerId:'provider_1'}).canReceiveSplit,true)
 assert.ok(assessProviderAsaasWallet({account:{...account,kycApproved:false},providerId:'provider_1'}).blockers.includes('KYC_APPROVAL_REQUIRED'))
 assert.ok(assessProviderAsaasWallet({account,providerId:'other'}).blockers.includes('WRONG_PROVIDER'))
 assert.ok(assessProviderAsaasWallet({account:{...account,walletId:'not-wallet'},providerId:'provider_1'}).blockers.includes('WALLET_VERIFICATION_REQUIRED'))
 assert.ok(assessProviderAsaasWallet({account,providerId:'provider_1',environment:'production'}).blockers.includes('SANDBOX_ONLY'))
})
