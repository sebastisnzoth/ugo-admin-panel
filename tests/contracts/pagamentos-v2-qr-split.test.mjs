import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasPixQrSandbox, buildPixWithProviderSplit } from '../../src/server/payments/asaasPixQrSandbox.mjs'
const input = {
  customerId: 'cus_test', amountBRL: 200, dueDate: '2026-11-10',
  serviceReference: 'ugo_service_test', providerWalletId: 'ab5b5a59-f2eb-40eb-8b8b-bb7314685a33', providerSharePercent: 85,
  issuerWalletId: 'b7f0bd20-06ee-4ce3-857c-c7868e8d071b', issuerWalletVerified: true,
  assignedProviderId: 'provider_test',
  providerAccount: { providerId: 'provider_test', walletId: 'ab5b5a59-f2eb-40eb-8b8b-bb7314685a33', environment: 'sandbox', verified: true },
}
test('Asaas Pix split routes only provider wallet; account owner retains remainder', () => {
  const p = buildPixWithProviderSplit(input)
  assert.equal(p.billingType, 'PIX')
  assert.equal(p.value, 200)
  assert.deepEqual(p.split, [{ walletId: 'ab5b5a59-f2eb-40eb-8b8b-bb7314685a33', percentualValue: 85 }])
  assert.equal(p.externalReference, 'ugo_service_test')
})
test('sandbox-only charge and QR retrieval obey supported endpoints', async () => {
  const urls = []
  const api = new AsaasPixQrSandbox({ apiKey: 'sandbox_fake', fetchImpl: async (url, init) => {
    urls.push(url)
    assert.equal(init.headers.access_token, 'sandbox_fake')
    return { ok: true, json: async () => url.endsWith('/pixQrCode') ?
      { payload: '000201test', encodedImage: 'fakebase64', expirationDate: '2026-11-10' } : { id: 'pay_test' } }
  } })
  await api.createChargeWithSplit(input)
  assert.deepEqual(await api.getQr('pay_test'), {
    copyPasteCode: '000201test', qrCodeImageBase64: 'fakebase64', expiresAt: '2026-11-10',
  })
  assert.deepEqual(urls, ['https://api-sandbox.asaas.com/v3/payments',
    'https://api-sandbox.asaas.com/v3/payments/pay_test/pixQrCode'])
})
test('rejects spoofed wallet, invalid money and invalid processor ids', async () => {
  assert.throws(() => buildPixWithProviderSplit({ ...input, providerWalletId: '../accounts' }))
  assert.throws(() => buildPixWithProviderSplit({ ...input, amountBRL: 1.001 }))
  assert.throws(() => buildPixWithProviderSplit({ ...input, providerSharePercent: 100.01 }))
  let called = false
  const api = new AsaasPixQrSandbox({ apiKey: 'fake', fetchImpl: async () => { called = true; throw Error('should not call') } })
  await assert.rejects(api.getQr('../config'))
  assert.equal(called, false)
})
test('fails closed when Asaas returns no payable QR', async () => {
  const api = new AsaasPixQrSandbox({ apiKey: 'fake', fetchImpl: async () => ({
    ok: true, json: async () => ({ payload: '' }),
  }) })
  await assert.rejects(api.getQr('pay_test'), /Missing Pix QR/)
})

test('sandbox client refuses to create Pix when issuer wallet is unverified', async () => {
  let called = false
  const api = new AsaasPixQrSandbox({ apiKey: 'fake', fetchImpl: async () => { called = true; throw Error('unexpected network') } })
  await assert.rejects(api.createChargeWithSplit({ ...input, issuerWalletVerified: false }), /UGO wallet not verified/)
  await assert.rejects(api.createChargeWithSplit({ ...input, providerWalletId: input.issuerWalletId,
    providerAccount: { ...input.providerAccount, walletId: input.issuerWalletId } }), /issuer wallet/)
  assert.equal(called, false)
})

test('simulation of payment confirmation is opt-in, POST, sandbox-only and never callable by default',async()=>{
 const calls=[]
 const api=new AsaasPixQrSandbox({apiKey:'sandbox_fake',fetchImpl:async(url,init)=>{
  calls.push({url,init});return {ok:true,json:async()=>({id:'pay_test',status:'RECEIVED'})}
 }})
 await assert.rejects(api.confirmSyntheticPayment('pay_test'),/explicit TEST authorization/)
 await assert.rejects(api.confirmSyntheticPayment('../unsafe',{testOnlyConfirmationAuthorized:true}),/Invalid paymentId/)
 assert.equal(calls.length,0)
 const confirmed=await api.confirmSyntheticPayment('pay_test',{testOnlyConfirmationAuthorized:true})
 assert.equal(confirmed.status,'RECEIVED')
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,'https://api-sandbox.asaas.com/v3/sandbox/payment/pay_test/confirm')
 assert.equal(calls[0].init.method,'POST')
})

test('UGO pilot disallows all non-85 recipient split rates before network issuance',async()=>{
 for(const rate of [0,15,80,84.99,85.01,90,100]){
  assert.throws(()=>buildPixWithProviderSplit({...input,providerSharePercent:rate}),/exactly 85/)
 }
 let calls=0
 const api=new AsaasPixQrSandbox({apiKey:'sandbox_fake',fetchImpl:async()=>{calls++;throw Error('unexpected network')}})
 await assert.rejects(api.createChargeWithSplit({...input,providerSharePercent:100}),/exactly 85/)
 assert.equal(calls,0)
})
