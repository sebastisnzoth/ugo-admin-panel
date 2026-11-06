import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasSandbox } from '../../src/server/payments/asaasSandbox.mjs'

test('Asaas gateway is pinned to sandbox and uses server-only header', async () => {
  const calls = []
  const api = new AsaasSandbox({ apiKey: 'test_key', fetchImpl: async (url, init) => {
    calls.push({ url, init })
    return { ok: true, json: async () => ({ id: 'pay_123' }) }
  } })
  const response = await api.createPix({ customerId: 'cus_123', value: 20.05, dueDate: '2026-11-10', externalReference: 'ugo_test_123' })
  assert.equal(response.id, 'pay_123')
  assert.equal(calls[0].url, 'https://api-sandbox.asaas.com/v3/payments')
  assert.equal(calls[0].init.headers.access_token, 'test_key')
  assert.equal(JSON.parse(calls[0].init.body).billingType, 'PIX')
  await api.getEscrowByPayment('pay_123')
  assert.equal(calls[1].url, 'https://api-sandbox.asaas.com/v3/payments/pay_123/escrow')
})
test('invalid amounts and IDs cannot reach Asaas', async () => {
  let called = false
  const api = new AsaasSandbox({ apiKey: 'test', fetchImpl: async () => { called = true; throw new Error('network') } })
  await assert.rejects(api.createPix({ customerId: 'customer', value: 0, dueDate: '2026-11-10', externalReference: 'service' }))
  await assert.rejects(api.getEscrowByPayment('../admin'))
  assert.equal(called, false)
})
test('errors are sanitized to avoid leaking processor responses', async () => {
  const api = new AsaasSandbox({ apiKey: 'private', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ apiKey: 'private' }) }) })
  await assert.rejects(api.getWallets(), e => e.message === 'Asaas sandbox request failed (401)' && !e.message.includes('private'))
})
