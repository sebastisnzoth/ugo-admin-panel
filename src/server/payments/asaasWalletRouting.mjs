/**
 * Validate Asaas marketplace wallet routing before issuing PIX Split.
 *
 * Wallet owner must be checked by the backend using the authenticated Asaas
 * GET /wallets response and a VERIFIED provider-to-subaccount linkage in
 * isolated TEST persistence. The user-supplied UGO wallet is a candidate,
 * NOT processor-verified until that comparison succeeds.
 *
 * The issuer wallet is deliberately omitted from split destinations:
 * Asaas leaves undistributed net value in the issuing account.
 */
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

export function validateWalletRouting({
  issuerWalletId, issuerWalletVerified, providerWalletId, providerAccount,
  assignedProviderId, environment = 'sandbox',
}) {
  if (environment !== 'sandbox') throw new Error('Only sandbox wallets supported')
  if (!UUID.test(issuerWalletId || '')) throw new Error('Invalid UGO wallet ID')
  if (issuerWalletVerified !== true) throw new Error('UGO wallet not verified against Asaas')
  if (!UUID.test(providerWalletId || '')) throw new Error('Invalid provider wallet ID')
  if (issuerWalletId.toLowerCase() === providerWalletId.toLowerCase())
    throw new Error('Cannot split to the charge issuer wallet')
  if (!assignedProviderId || providerAccount?.providerId !== assignedProviderId ||
      providerAccount?.walletId?.toLowerCase() !== providerWalletId.toLowerCase() ||
      providerAccount?.environment !== environment || providerAccount?.verified !== true)
    throw new Error('Provider wallet ownership not verified')
  return Object.freeze({ providerWalletId, environment })
}
