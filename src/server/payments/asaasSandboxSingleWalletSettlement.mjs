/**
 * Standalone Sandbox Pix: processor receipt + deterministic UGO INTERNAL
 * allocation projection. No split is sent to Asaas, no external recipient,
 * no money movement, no escrow and no ledger write.
 *
 * The projection MUST NOT be persisted as a settled split or provider payout.
 */
import {reconcileAuthenticatedPix} from './asaasPixReconciliation.mjs'

const positiveCents=n=>Number.isSafeInteger(n)&&n>0
export function projectLocalSandboxSplit({
  netCents, providerShareBps=8500, issuerWalletVerified=false,
}={}) {
 if(!positiveCents(netCents)||netCents>Math.floor((Number.MAX_SAFE_INTEGER-50)/85)||
    providerShareBps!==8500||issuerWalletVerified!==true)
   throw Error('Sandbox allocation requires verified issuer and integer net cents')
 // Half-up rounding in integer arithmetic; remainder always stays with UGO.
 const providerCents=Math.floor((netCents*85+50)/100)
 const ugoCents=netCents-providerCents
 if(!positiveCents(providerCents)||ugoCents<0||!Number.isSafeInteger(ugoCents))
   throw Error('Invalid simulated sandbox allocation')
 return Object.freeze({
   mode:'LOCAL_SIMULATION_ONLY',netCents,providerCents,ugoCents,
   providerShareBps,ugoShareBps:1500,
   recipientWalletVerified:false,splitSettled:false,providerPaid:false,
   escrowAvailable:false,ledgerPosted:false,
 })
}
export function reconcileStandaloneSandboxPix({
 payment,expected,issuerWalletVerified=false,
}={}) {
 const state=reconcileAuthenticatedPix({payment,expected})
 if(state.kind!=='received')
   return Object.freeze({kind:state.kind,simulation:null,
     splitSettled:false,providerPaid:false,ledgerPosted:false})
 const simulation=projectLocalSandboxSplit({
   netCents:state.netCents,issuerWalletVerified
 })
 return Object.freeze({kind:'received',grossCents:state.grossCents,
   netCents:state.netCents,simulation,
   splitSettled:false,providerPaid:false,ledgerPosted:false})
}
