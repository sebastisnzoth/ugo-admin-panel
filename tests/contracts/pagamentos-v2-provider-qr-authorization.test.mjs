import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeProviderPixQr } from '../../src/server/payments/providerQrAuthorization.mjs'
const valid = {
  actorId: 'pro_1',
  service: { id: 'svc_1', proveedor_id: 'pro_1', cliente_id: 'cli_1', estado: 'esperando_aprobacion', moneda: 'BRL', tarifa: 200 },
  account: { proveedor_id: 'pro_1', walletId: 'wal_1', verified: true, environment: 'sandbox' },
  payment: null,
}
test('assigned provider with completed job and verified sandbox wallet can request QR', () => {
  assert.deepEqual(authorizeProviderPixQr(valid), { mode: 'create', serviceId: 'svc_1', customerId: 'cli_1', walletId: 'wal_1', amountBRL: 200 })
})
test('provider cannot request QR for another provider service', () => {
  assert.throws(() => authorizeProviderPixQr({ ...valid, actorId: 'attacker' }), /assigned provider/)
})
test('QR blocked before completion, for refund, foreign currency or unverified wallet', () => {
  for (const change of [
    { service: { ...valid.service, estado: 'en_progreso' } },
    { service: { ...valid.service, moneda: 'ARS' } },
    { account: { ...valid.account, verified: false } },
    { account: { ...valid.account, environment: 'production' } },
    { payment: { state: 'refunded' } },
    { payment: { state: 'released' } },
  ]) assert.throws(() => authorizeProviderPixQr({ ...valid, ...change }))
})
test('existing pending, unexpired QR should be reused', () => {
  const r = authorizeProviderPixQr({ ...valid, payment: { state: 'pending', expiresAt: '2999-01-01T00:00:00Z', processorPaymentId: 'pay_1' } })
  assert.equal(r.mode, 'reuse_pending')
  assert.equal(r.paymentId, 'pay_1')
})

test('Pix pending or ambiguous attempts cannot create duplicate charges', () => {
  for (const payment of [
    { state: 'pending' },
    { state: 'pending', processorPaymentId: 'pay_1' },
    { state: 'pending', processorPaymentId: 'pay_1', expiresAt: '2026-01-01T00:00:00Z' },
    { state: 'pending', processorPaymentId: 'pay_1', expiresAt: 'not-a-date' },
    { state: 'unknown_processor_state' },
  ]) assert.throws(() => authorizeProviderPixQr({ ...valid, payment }), /reconciliation/)
})
