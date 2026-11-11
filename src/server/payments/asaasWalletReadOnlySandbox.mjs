/**
 * Read-only Asaas Sandbox wallet verifier.
 * Does not expose API keys, set secrets, modify UGO DB or create charges.
 * The expected issuer wallet must come from a server-side setting, never from
 * a client request. The result is for backend decisions, not a public API.
 */
const BASE = 'https://api-sandbox.asaas.com/v3'
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const uuid = x => typeof x === 'string' && UUID.test(x)
export function parseAuthenticatedWallet(payload, expectedWalletId) {
  if (!uuid(expectedWalletId)) throw new Error('Invalid expected wallet identifier')
  const records = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : null
  // Asaas GET /v3/wallets/ returns objects using 'id'; legacy mocks may
  // contain 'walletId'. Reject conflicting fields instead of guessing.
  if (!records || records.length !== 1)
    throw new Error('Ambiguous authenticated wallet response')
  const record=records[0]
  const actual=record?.id ?? record?.walletId
  if(!uuid(actual) || (record?.id && record?.walletId &&
      record.id.toLowerCase()!==record.walletId.toLowerCase()))
    throw new Error('Ambiguous authenticated wallet response')
  if (actual.toLowerCase() !== expectedWalletId.toLowerCase())
    throw new Error('Configured UGO wallet differs from authenticated Sandbox account')
  return Object.freeze({ verified: true, environment: 'sandbox', walletId: actual })
}
export class AsaasWalletReadOnlySandbox {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Missing sandbox API key')
    if (typeof fetchImpl !== 'function') throw new Error('Missing fetch implementation')
    this.apiKey = apiKey
    this.fetchImpl = fetchImpl
  }
  async verifyIssuerWallet(expectedWalletId) {
    if (!uuid(expectedWalletId)) throw new Error('Invalid expected wallet identifier')
    const response = await this.fetchImpl(BASE + '/wallets/', {
      method: 'GET', headers: {
        access_token: this.apiKey, accept: 'application/json',
        'User-Agent': 'UGO-Pagamentos-V2-Sandbox/0.1',
      },
    })
    if (!response?.ok) throw new Error('Asaas sandbox wallet verification failed (' + (response?.status || 0) + ')')
    const payload = await response.json().catch(() => null)
    return parseAuthenticatedWallet(payload, expectedWalletId)
  }
}
