/** UGO Pagamentos V2 — pure financial safeguards. No live API, DB or network access. */
export const ESCROW_STATES = Object.freeze({
  pending: 'pending', received: 'received', guaranteed: 'guaranteed',
  releaseRequested: 'release_requested', released: 'released',
  disputed: 'disputed', refunded: 'refunded', failed: 'failed',
})
function cents(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new RangeError('Invalid BRL amount')
  const raw = amount * 100
  if (Math.abs(Math.round(raw) - raw) > 1e-7) throw new RangeError('Amount must have at most two decimals')
  return Math.round(raw)
}
/** Advisory split only. Processor fees are deducted before net-value distribution. */
export function quoteNetSplit({ grossBRL, processingFeeBRL, commissionBps = 1500 }) {
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10000) throw new RangeError('Invalid commission basis points')
  const grossCents = cents(grossBRL)
  const feeCents = cents(processingFeeBRL)
  if (feeCents > grossCents) throw new RangeError('Fees exceed gross payment')
  const netCents = grossCents - feeCents
  const ugoCents = Math.round((netCents * commissionBps) / 10000)
  const providerCents = netCents - ugoCents
  return Object.freeze({ grossCents, feeCents, netCents, ugoCents, providerCents, commissionBps })
}
/** Guard an EARLY release. Processor's scheduled expiry is independent and must be displayed. */
export function assertEarlyReleaseAllowed(input) {
  const { state, serviceState, paymentVerified, escrowConfirmed,
    disputed, refunded, actorRole, actorAuthorized, providerAccountVerified,
    externalGuaranteeId, requestId } = input
  if (state !== ESCROW_STATES.guaranteed) throw new Error('Payment not guaranteed')
  if (serviceState !== 'concluido') throw new Error('Service not completed')
  if (paymentVerified !== true || escrowConfirmed !== true) throw new Error('Processor receipt/guarantee unverified')
  if (disputed === true || refunded === true) throw new Error('Disputed or refunded payment')
  if (!['admin', 'super_admin'].includes(actorRole) || actorAuthorized !== true) throw new Error('Unauthorized release')
  if (providerAccountVerified !== true) throw new Error('Provider payout account unverified')
  if (typeof externalGuaranteeId !== 'string' || !externalGuaranteeId.trim()) throw new Error('Missing external guarantee')
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(requestId)) throw new Error('Invalid idempotency key')
  return Object.freeze({ guaranteeId: externalGuaranteeId, requestId })
}
/** Only a verified processor response can advance to released. */
export function reconcileRelease({ state, processorReleased, guaranteeId, reportedGuaranteeId }) {
  if (state === ESCROW_STATES.released && processorReleased === true && typeof guaranteeId === 'string' && guaranteeId.length > 0 && guaranteeId === reportedGuaranteeId) return ESCROW_STATES.released
  if (state !== ESCROW_STATES.releaseRequested) throw new Error('Invalid release state')
  if (processorReleased !== true || !guaranteeId || guaranteeId !== reportedGuaranteeId) throw new Error('Release not verified by processor')
  return ESCROW_STATES.released
}
