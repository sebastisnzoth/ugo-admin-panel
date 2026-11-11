/**
 * Sandbox-only transport for UGO Pagamentos V2.
 * This module NEVER contacts production. It is not connected to existing checkout.
 * Does not implement release: require DB locks, audit, eligibility and processor
 * permission verification before implementing irreversible /escrow/{id}/finish.
 */
const BASE = 'https://api-sandbox.asaas.com/v3'
const ID = /^[a-zA-Z0-9_-]{1,100}$/
function checkedId(value) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('Invalid Asaas identifier')
  return value
}
function checkedMoney(value) {
  if (!Number.isFinite(value) || value <= 0 || Math.abs(Math.round(value * 100) - value * 100) > 1e-7) {
    throw new Error('Invalid BRL amount')
  }
  return value
}
export class AsaasSandbox {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Missing sandbox API key')
    if (typeof fetchImpl !== 'function') throw new Error('Missing fetch implementation')
    this.apiKey = apiKey
    this.fetchImpl = fetchImpl
  }
  async request(path, { method = 'GET', body } = {}) {
    if (!path.startsWith('/') || path.includes('..') || path.includes('?') || path.includes('#')) throw new Error('Invalid API path')
    const response = await this.fetchImpl(BASE + path, {
      method, headers: {
        'access_token': this.apiKey, 'accept': 'application/json',
        'content-type': 'application/json', 'User-Agent': 'UGO-Pagamentos-V2-Sandbox/0.1',
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error('Asaas sandbox request failed (' + response.status + ')')
    return payload
  }
  async getWallets() { return this.request('/wallets/') }
  async getPayment(paymentId) { return this.request('/payments/' + checkedId(paymentId)) }
  async getEscrowByPayment(paymentId) { return this.request('/payments/' + checkedId(paymentId) + '/escrow') }
  /** Create only a sandbox PIX charge. Customer ID must be generated in sandbox. */
  async createPix({ customerId, value, dueDate, externalReference }) {
    checkedId(customerId)
    if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Invalid due date')
    if (typeof externalReference !== 'string' || !ID.test(externalReference)) throw new Error('Invalid external reference')
    return this.request('/payments', {
      method: 'POST',
      body: { customer: customerId, billingType: 'PIX', value: checkedMoney(value), dueDate, externalReference },
    })
  }
}
