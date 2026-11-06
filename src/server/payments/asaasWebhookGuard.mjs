/**
 * Pure webhook envelope validation for isolated UGO Pagamentos V2.
 * Caller must persist event ID with a UNIQUE constraint BEFORE responding 200,
 * then fetch payment status from Asaas server-side. This file does NOT settle payments.
 */
import { createHash, timingSafeEqual } from 'node:crypto'

function digest(value) { return createHash('sha256').update(value).digest() }

export function verifyAsaasWebhookToken(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' ||
      actual.length < 32 || expected.length < 32 || actual.length > 255 || expected.length > 255) return false
  return timingSafeEqual(digest(actual), digest(expected))
}
const SAFE_ID = /^[A-Za-z0-9_\-]+$/
export function parseAsaasPaymentEvent(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid webhook')
  const { id, event, payment } = payload
  if (typeof id !== 'string' || id.length === 0 || id.length > 160 || [...id].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error('Invalid event ID')
  if (typeof event !== 'string' || event.length > 100 || !SAFE_ID.test(event)) throw new Error('Invalid event name')
  if (typeof payment?.id !== 'string' || payment.id.length > 160 || !SAFE_ID.test(payment.id))
    throw new Error('Invalid payment ID')
  // These values only identify a reconciliation job; never authorize a credit.
  return Object.freeze({ eventId: id, kind: event, externalPaymentId: payment.id })
}
