import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteNetSplit, assertEarlyReleaseAllowed, reconcileRelease, ESCROW_STATES } from '../../src/server/payments/escrowPolicy.mjs'
const eligible = {
  state: 'guaranteed', serviceState: 'concluido', paymentVerified: true, escrowConfirmed: true,
  disputed: false, refunded: false, actorRole: 'admin', actorAuthorized: true,
  providerAccountVerified: true, externalGuaranteeId: 'escrow-123', requestId: 'release-1234567890',
}
test('net split preserves cents and subtracts fees before commission', () => {
  assert.deepEqual(quoteNetSplit({ grossBRL: 200, processingFeeBRL: 2, commissionBps: 1500 }), {
    grossCents: 20000, feeCents: 200, netCents: 19800, ugoCents: 2970, providerCents: 16830, commissionBps: 1500,
  })
})
test('rounding cannot lose money', () => {
  for (const amount of [0, 0.01, 10.01, 99.99]) {
    const q = quoteNetSplit({ grossBRL: amount, processingFeeBRL: 0, commissionBps: 1750 })
    assert.equal(q.ugoCents + q.providerCents + q.feeCents, q.grossCents)
  }
})
test('reject invalid money and percentages', () => {
  assert.throws(() => quoteNetSplit({ grossBRL: 5.001, processingFeeBRL: 0 }), /decimals/)
  assert.throws(() => quoteNetSplit({ grossBRL: 5, processingFeeBRL: 6 }), /Fees/)
  assert.throws(() => quoteNetSplit({ grossBRL: 5, processingFeeBRL: 0, commissionBps: 10001 }), /basis/)
})
test('allows eligible completion release', () => assert.equal(assertEarlyReleaseAllowed(eligible).guaranteeId, 'escrow-123'))
test('blocks release before completion, on dispute, or without authoritative proof', () => {
  const changes = [
    { serviceState: 'en_progreso' }, { disputed: true }, { refunded: true },
    { actorRole: 'provider' }, { actorAuthorized: false }, { paymentVerified: false },
    { escrowConfirmed: false }, { providerAccountVerified: false }, { state: 'received' },
    { externalGuaranteeId: '' }, { requestId: 'short' },
  ]
  for (const change of changes) assert.throws(() => assertEarlyReleaseAllowed({ ...eligible, ...change }))
})
test('release reconciles only processor-confirmed matching guarantee', () => {
  assert.equal(reconcileRelease({ state: ESCROW_STATES.releaseRequested, processorReleased: true, guaranteeId: 'g1', reportedGuaranteeId: 'g1' }), ESCROW_STATES.released)
  assert.throws(() => reconcileRelease({ state: ESCROW_STATES.releaseRequested, processorReleased: true, guaranteeId: 'g1', reportedGuaranteeId: 'g2' }))
  assert.throws(() => reconcileRelease({ state: ESCROW_STATES.releaseRequested, processorReleased: false, guaranteeId: 'g1', reportedGuaranteeId: 'g1' }))
})
