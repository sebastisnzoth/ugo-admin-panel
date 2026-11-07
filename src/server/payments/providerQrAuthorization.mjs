/**
 * UGO Pagamentos V2: pure eligibility guard.
 * Caller MUST retrieve service, account, and payment from isolated server database;
 * NEVER trust these fields from a provider-supplied request body.
 * Real atomic payment-attempt lock belongs in TEST DB, not in this function.
 */
const STATUSES = new Set(['esperando_aprobacion', 'completado'])
export function authorizeProviderPixQr({ actorId, service, account, payment }) {
  if (typeof actorId !== 'string' || !actorId) throw new Error('Authentication required')
  if (!service || service.proveedor_id !== actorId || !service.cliente_id) throw new Error('Not the assigned provider')
  if (!STATUSES.has(service.estado)) throw new Error('Service must have finished')
  if ((service.moneda || 'BRL') !== 'BRL') throw new Error('Pix requires BRL')
  if (typeof service.tarifa !== 'number' || !Number.isFinite(service.tarifa) || service.tarifa <= 0 ||
      Math.abs(Math.round(service.tarifa * 100) - service.tarifa * 100) > 1e-7) throw new Error('Invalid server-side tariff')
  if (!account || account.proveedor_id !== actorId || account.verified !== true ||
      account.environment !== 'sandbox' || typeof account.walletId !== 'string' || !account.walletId)
    throw new Error('Provider sandbox wallet not verified')
  if (payment && ['confirmed', 'received', 'held', 'released', 'refunded', 'processing'].includes(payment.state))
    throw new Error('Payment already processed or blocked')
  // Unknown, missing or expired pending-QR state requires reconciliation,
  // never silently create a second live charge for the same service.
  if (payment && payment.state === 'pending') {
    if (typeof payment.processorPaymentId !== 'string' || !payment.processorPaymentId)
      throw new Error('Pending Pix charge requires reconciliation')
    if (!payment.expiresAt || !Number.isFinite(Date.parse(payment.expiresAt)))
      throw new Error('Pending Pix expiry requires reconciliation')
    if (Date.parse(payment.expiresAt) <= Date.now())
      throw new Error('Expired Pix charge requires processor reconciliation')
    return Object.freeze({ mode: 'reuse_pending', paymentId: payment.processorPaymentId })
  }
  if (payment && !['failed', 'cancelled'].includes(payment.state))
    throw new Error('Unknown payment state requires reconciliation')
  return Object.freeze({
    mode: 'create', serviceId: service.id, customerId: service.cliente_id,
    walletId: account.walletId, amountBRL: service.tarifa,
  })
}
