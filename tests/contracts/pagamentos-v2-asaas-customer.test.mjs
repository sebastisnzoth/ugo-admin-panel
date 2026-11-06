import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasCustomerSandbox, buildAsaasCustomer, shouldCreateAsaasCustomer } from '../../src/server/payments/asaasCustomerSandbox.mjs'
const payer = { name: 'Cliente Teste', cpfCnpj: '12345678901', externalReference: 'ugo_test_client_1', mobilePhone: '48999999999' }
test('build Asaas payer with UGO reference, without leaking sandbox transport to browser', () => {
  assert.deepEqual(buildAsaasCustomer(payer), { ...payer, notificationDisabled: true })
})
test('customer registration pins sandbox endpoint, uses secret header and returns ID only', async () => {
  const urls = []
  const api = new AsaasCustomerSandbox({ apiKey: 'test_only', fetchImpl: async (url, init) => {
    urls.push(url)
    assert.equal(init.headers.access_token, 'test_only')
    assert.equal(JSON.parse(init.body).externalReference, payer.externalReference)
    return { ok: true, json: async () => ({ id: 'cus_123', cpfCnpj: payer.cpfCnpj }) }
  } })
  assert.deepEqual(await api.createCustomer(payer), { customerId: 'cus_123' })
  assert.deepEqual(urls, ['https://api-sandbox.asaas.com/v3/customers'])
})
test('existing sandbox payer is reused; malformed or cross-environment linkage is refused', () => {
  assert.equal(shouldCreateAsaasCustomer(null), true)
  assert.equal(shouldCreateAsaasCustomer({ environment: 'sandbox', asaasCustomerId: 'cus_123' }), false)
  assert.throws(() => shouldCreateAsaasCustomer({ environment: 'production', asaasCustomerId: 'cus_123' }))
  assert.throws(() => shouldCreateAsaasCustomer({ environment: 'sandbox', asaasCustomerId: '../admin' }))
})
test('invalid payer payload is rejected before network call', async () => {
  let called = false
  const api = new AsaasCustomerSandbox({ apiKey: 'test_only', fetchImpl: async () => { called = true; throw Error('Must not call') } })
  await assert.rejects(api.createCustomer({ ...payer, cpfCnpj: 'abc' }), /document format/)
  await assert.rejects(api.createCustomer({ ...payer, externalReference: '../admin' }), /reference/)
  assert.equal(called, false)
})
test('processor errors never echo personal data', async () => {
  const api = new AsaasCustomerSandbox({ apiKey: 'private', fetchImpl: async () => ({ ok: false, status: 409, json: async () => ({ cpfCnpj: payer.cpfCnpj }) }) })
  await assert.rejects(api.createCustomer(payer), e => e.message === 'Asaas sandbox customer request failed (409)' && !e.message.includes(payer.cpfCnpj))
})
