import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasPixQrSandbox, buildPixWithProviderSplit } from '../../src/server/payments/asaasPixQrSandbox.mjs'
const input = {
  customerId: 'cus_test', amountBRL: 200, dueDate: '2026-11-10',
  serviceReference: 'ugo_service_test', providerWalletId: 'wal_test', providerSharePercent: 85,
}
test('Asaas Pix split routes only provider wallet; account owner retains remainder', () => {
  const p = buildPixWithProviderSplit(input)
  assert.equal(p.billingType, 'PIX')
  assert.equal(p.value, 200)
  assert.deepEqual(p.split, [{ walletId: 'wal_test', percentualValue: 85 }])
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
