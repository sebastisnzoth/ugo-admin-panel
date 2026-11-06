/**
 * Pix presencial UGO — sandbox-only, unused integration adapter.
 * Do NOT wire to live checkout, frontend, or Arena PROD.
 * Validating service ownership, price, charge uniqueness and wallet ownership
 * MUST happen in a separate authenticated server handler before invocation.
 */
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
  async createChargeWithSplit(input) {
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
}
