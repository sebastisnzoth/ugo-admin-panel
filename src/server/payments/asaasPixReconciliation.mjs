/**
 * Pure processor reconciliation gate for UGO Pagamentos V2 Sandbox.
 * This function DOES NOT mutate a ledger or prove that a Split settled.
 * Use only with a fresh GET /v3/payments/{id} response from authenticated
 * Asaas Sandbox transport, never the incoming webhook payload.
 */
const ID = /^[a-zA-Z0-9_-]{1,100}$/
const PAID = new Set(['RECEIVED', 'CONFIRMED'])
const REFUND = new Set(['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'])
const FAILED = new Set(['OVERDUE', 'DELETED', 'DUNNING_REQUESTED'])
const PENDING = new Set(['PENDING', 'AWAITING_RISK_ANALYSIS'])
const validAmount = n => typeof n === 'number' && Number.isFinite(n) && n > 0 && Math.abs(Math.round(n*100)-n*100) < 1e-7

export function reconcileAuthenticatedPix({ payment, expected }) {
  if (!payment || !expected || !ID.test(expected.paymentId || '') ||
      payment.id !== expected.paymentId ||
      payment.externalReference !== expected.serviceReference ||
      payment.customer !== expected.customerId ||
      payment.billingType !== 'PIX' ||
      !validAmount(expected.amountBRL) || !validAmount(payment.value) ||
      Math.round(payment.value * 100) !== Math.round(expected.amountBRL * 100))
    throw new Error('Processor payment identity or amount mismatch')

  if (!ID.test(payment.status || '')) throw new Error('Unknown processor payment status')
  if (REFUND.has(payment.status)) return Object.freeze({ kind:'review', reason:'refund_or_chargeback' })
  if (FAILED.has(payment.status)) return Object.freeze({ kind:'unpaid', reason:'not_receivable' })
  if (PENDING.has(payment.status)) return Object.freeze({ kind:'pending' })
  if (!PAID.has(payment.status)) throw new Error('Unrecognized processor status requires review')
  if (payment.status === 'CONFIRMED') return Object.freeze({ kind:'confirmed_not_settled' })
  // RECEIVED proves a processor-reported collection, not provider split payout.
  if (!validAmount(payment.netValue) || payment.netValue > payment.value)
    throw new Error('Processor netValue mismatch')
  return Object.freeze({
    kind:'received',
    grossCents:Math.round(payment.value*100),
    netCents:Math.round(payment.netValue*100),
    splitSettled:false, // requires separate reconciliation/event by splitId
    escrowReleased:false,
  })
}
