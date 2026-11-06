/**
 * Isolated Asaas Sandbox customer registration helper (NOT connected to UGO PROD).
 * One Asaas customer per UGO payer; do not create one customer per charge.
 * DB linking and uniqueness/transaction locks must be implemented in isolated TEST DB.
 * Never log personal identifiers, responses, keys, or request bodies.
 */
const BASE = 'https://api-sandbox.asaas.com/v3'
const ID = /^[A-Za-z0-9_-]{1,100}$/
export function buildAsaasCustomer({ name, cpfCnpj, email, mobilePhone, externalReference }) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 200) throw new Error('Invalid payer name')
  if (typeof cpfCnpj !== 'string' || !/^(?:\\d{11}|\\d{14})$/.test(cpfCnpj)) throw new Error('Invalid payer document format')
  if (typeof externalReference !== 'string' || !ID.test(externalReference)) throw new Error('Invalid payer reference')
  if (email !== undefined && (typeof email !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))) throw new Error('Invalid email')
  if (mobilePhone !== undefined && (typeof mobilePhone !== 'string' || !/^\\d{10,11}$/.test(mobilePhone))) throw new Error('Invalid mobile phone')
  return {
    name: name.trim(), cpfCnpj, externalReference,
    ...(email === undefined ? {} : { email }),
    ...(mobilePhone === undefined ? {} : { mobilePhone }),
    notificationDisabled: true,
  }
}
export class AsaasCustomerSandbox {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Missing Asaas Sandbox key')
    if (typeof fetchImpl !== 'function') throw new Error('Invalid network handler')
    this.apiKey = apiKey
    this.fetchImpl = fetchImpl
  }
  async createCustomer(input) {
    const response = await this.fetchImpl(BASE + '/customers', {
      method: 'POST',
      headers: {
        access_token: this.apiKey, accept: 'application/json',
        'content-type': 'application/json', 'User-Agent': 'UGO-Pagamentos-V2-Sandbox/0.1',
      },
      body: JSON.stringify(buildAsaasCustomer(input)),
    })
    if (!response?.ok) throw new Error('Asaas sandbox customer request failed (' + (response?.status || 0) + ')')
    const data = await response.json().catch(() => null)
    if (!data || typeof data.id !== 'string' || !ID.test(data.id)) throw new Error('Invalid Asaas customer response')
    // Expose only the processor ID to avoid leaking PII from response.
    return Object.freeze({ customerId: data.id })
  }
}
/** Local mapping is mandatory. Inconclusive outcomes must be reconciled before retry. */
export function shouldCreateAsaasCustomer(localLink) {
  if (localLink === null || localLink === undefined) return true
  if (localLink.environment !== 'sandbox' || typeof localLink.asaasCustomerId !== 'string' ||
      !ID.test(localLink.asaasCustomerId)) throw new Error('Invalid stored Asaas payer linkage')
  return false
}
