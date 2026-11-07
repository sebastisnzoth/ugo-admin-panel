/**
 * Pix presencial UGO — sandbox-only, unused integration adapter.
 * Do NOT wire to live checkout, frontend, or Arena PROD.
 * Validating service ownership, price, charge uniqueness and wallet ownership
 * MUST happen in a separate authenticated server handler before invocation.
 */
import { validateWalletRouting } from './asaasWalletRouting.mjs'
const BASE = 'https://api-sandbox.asaas.com/v3'
const ID = /^[a-zA-Z0-9_-]{1,100}$/
function requireId(v, name) {
  if (typeof v !== 'string' || !ID.test(v)) throw new Error('Invalid ' + name)
  return v
}
function requireAmount(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 ||
      Math.abs(Math.round(v * 100) - v * 100) > 1e-7) throw new Error('Invalid amount')
  return v
}
export function buildPixWithProviderSplit({
  customerId, amountBRL, dueDate, serviceReference, providerWalletId, providerSharePercent = 85,
}) {
  requireId(customerId, 'customerId')
  requireId(serviceReference, 'serviceReference')
  requireId(providerWalletId, 'providerWalletId')
  requireAmount(amountBRL)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '')) throw new Error('Invalid dueDate')
  if (!Number.isFinite(providerSharePercent) || providerSharePercent <= 0 ||
      providerSharePercent > 100 || Math.round(providerSharePercent * 10000) !== providerSharePercent * 10000)
    throw new Error('Invalid providerSharePercent')
  return Object.freeze({
    customer: customerId,
    billingType: 'PIX',
    value: amountBRL,
    dueDate,
    externalReference: serviceReference,
    split: [{ walletId: providerWalletId, percentualValue: providerSharePercent }],
  })
}
/**
 * Independent, no-Split PIX fixture. This is NOT a marketplace payout and
 * intentionally omits the split field. Server-owned customer ID and reference
 * must be verified before calling the processor.
 */
export function buildPixWithoutSplit({
  customerId, amountBRL, dueDate, serviceReference,
}) {
  requireId(customerId, 'customerId')
  requireId(serviceReference, 'serviceReference')
  requireAmount(amountBRL)
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate || '') ||
      !Number.isFinite(Date.parse(dueDate + 'T00:00:00Z')) ||
      new Date(dueDate + 'T00:00:00Z').toISOString().slice(0,10)!==dueDate)
    throw new Error('Invalid dueDate')
  return Object.freeze({
    customer: customerId,
    billingType: 'PIX',
    value: amountBRL,
    dueDate,
    externalReference: serviceReference,
    notificationDisabled: true,
  })
}
export class AsaasPixQrSandbox {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Missing Asaas Sandbox key')
    this.apiKey = apiKey
    this.fetchImpl = fetchImpl
  }
  async request(path, method = 'GET', body) {
    const response = await this.fetchImpl(BASE + path, {
      method,
      headers: {
        access_token: this.apiKey, accept: 'application/json',
        'content-type': 'application/json', 'User-Agent': 'UGO-Pagamentos-V2-Sandbox/0.1',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw new Error('Asaas sandbox request failed (' + response.status + ')')
    return response.json()
  }
  async createChargeWithoutSplit(input, { testOnlyChargeAuthorized = false } = {}) {
    if (testOnlyChargeAuthorized !== true)
      throw new Error('Standalone Sandbox Pix creation requires explicit TEST authorization')
    if (input?.providerWalletId || input?.split || input?.providerSharePercent !== undefined)
      throw new Error('Standalone Sandbox Pix must not contain a provider split')
    const payload = buildPixWithoutSplit(input)
    return this.request('/payments', 'POST', payload)
  }
  async createChargeWithSplit(input) {
    // Defense-in-depth: fail before any processor request if issuer or recipient
    // was not verified from authenticated server-side account records.
    validateWalletRouting(input)
    return this.request('/payments', 'POST', buildPixWithProviderSplit(input))
  }
  async getQr(paymentId) {
    const data = await this.request('/payments/' + requireId(paymentId, 'paymentId') + '/pixQrCode')
    if (typeof data?.payload !== 'string' || !data.payload ||
        typeof data?.encodedImage !== 'string' || !data.encodedImage)
      throw new Error('Missing Pix QR data from processor')
    return Object.freeze({
      copyPasteCode: data.payload, qrCodeImageBase64: data.encodedImage,
      expiresAt: data.expirationDate || null,
    })
  }
  async getCharge(paymentId) {
    return this.request('/payments/' + requireId(paymentId, 'paymentId'))
  }
  // Read-only verification on the source Asaas account. Caller must separately
  // validate the exact recipient and status before updating any local Split.
  async getPaidSplit(splitId) {
    return this.request('/payments/splits/paid/' + requireId(splitId, 'splitId'))
  }
  /**
   * Simulate processor settlement in Asaas SANDBOX ONLY.
   * This API is never reachable from the frontend or any production handler.
   * Do not call without explicit test-harness authorization and fixture checks.
   */
  async confirmSyntheticPayment(paymentId, { testOnlyConfirmationAuthorized = false } = {}) {
    requireId(paymentId, 'paymentId')
    if (testOnlyConfirmationAuthorized !== true)
      throw new Error('Asaas sandbox confirmation requires explicit TEST authorization')
    return this.request('/sandbox/payment/' + paymentId + '/confirm', 'POST')
  }

}
