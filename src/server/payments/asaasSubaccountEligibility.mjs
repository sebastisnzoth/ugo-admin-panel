/**
 * PRE-CREATION GATE. Pure and side-effect-free.
 * No POST /accounts should be attempted without verifying these facts server-side.
 * Asaas currently requires the parent account to be a legal entity (CNPJ).
 * A Pix key alone is not a verified Asaas subaccount or wallet.
 */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

export function assessProviderAsaasSetup({parent,provider,environment='sandbox'}={}) {
  const blockers=[]
  if(environment!=='sandbox') blockers.push('SANDBOX_ONLY')
  if(parent?.registrationType!=='CNPJ' || parent?.verified!==true)
    blockers.push('PARENT_CNPJ_REQUIRED')
  if(parent?.subaccountsEnabled!==true) blockers.push('SUBACCOUNTS_NOT_ENABLED')
  if(parent?.creationFeesReviewed!==true) blockers.push('COST_APPROVAL_REQUIRED')
  if(!provider?.ugoProviderId || provider?.authenticated!==true)
    blockers.push('PROVIDER_AUTH_REQUIRED')
  if(provider?.consentToAsaas!==true) blockers.push('PROVIDER_CONSENT_REQUIRED')
  if(provider?.kycReady!==true) blockers.push('KYC_REQUIRED')
  return Object.freeze({canCreateSubaccount:blockers.length===0,blockers:Object.freeze(blockers)})
}

export function assessProviderAsaasWallet({account,providerId,environment='sandbox'}={}) {
  const blockers=[]
  if(environment!=='sandbox') blockers.push('SANDBOX_ONLY')
  if(account?.environment!=='sandbox') blockers.push('UNVERIFIED_ENVIRONMENT')
  if(!providerId || account?.ugoProviderId!==providerId) blockers.push('WRONG_PROVIDER')
  if(account?.verified!==true || !UUID.test(account?.walletId||''))
    blockers.push('WALLET_VERIFICATION_REQUIRED')
  if(account?.kycApproved!==true) blockers.push('KYC_APPROVAL_REQUIRED')
  return Object.freeze({canReceiveSplit:blockers.length===0,blockers:Object.freeze(blockers)})
}
