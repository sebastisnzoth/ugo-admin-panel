/**
 * Isolated UGO Pagamentos V2 checkout orchestration contract.
 * Deliberately NOT imported by any Vercel route or production frontend.
 * Repository methods are server-trusted and MUST implement an atomic UNIQUE
 * reservation in a standalone TEST DB before this can be enabled.
 *
 * Contract:
 * repo.loadContext(serviceId) -> {
 *   service, providerAccount, issuerWalletId, issuerWalletVerified,
 *   customerLink, payment
 * }
 * repo.reservePix({serviceId, providerId, amountBRL}) -> {
 *   mode:'reserved', reservationId
 * } OR {mode:'existing', paymentId} OR {mode:'reconcile'}
 * repo.recordProcessorCharge({reservationId,paymentId})
 * repo.markUncertain({reservationId}) (must not silently unlock)
 */
import { authorizeProviderPixQr } from './providerQrAuthorization.mjs'
import { validateWalletRouting } from './asaasWalletRouting.mjs'
import { reconcileAuthenticatedPix } from './asaasPixReconciliation.mjs'

const ID=/^[a-zA-Z0-9_-]{1,100}$/
export async function issueSandboxPixQr({
  serviceId, authenticatedProviderId, repo, asaas, dueDate, providerSharePercent=85,
}) {
  if(!ID.test(serviceId||'') || !ID.test(authenticatedProviderId||''))
    throw Error('Invalid authenticated service request')
  if (!repo || !asaas) throw Error('Isolated payment dependencies required')
  const ctx=await repo.loadContext(serviceId)
  const service=ctx?.service
  const account=ctx?.providerAccount
  // Canonical externalReference must be the same value stored by Neon and sent
  // to Asaas. Never reconstruct a different identifier during reconciliation.
  const paymentReference=ctx?.serviceReference ?? serviceId
  if(typeof paymentReference!=='string'||!ID.test(paymentReference))
    throw Error('Invalid canonical Pix payment reference')
  const eligibility=authorizeProviderPixQr({
    actorId:authenticatedProviderId,service,account,payment:ctx?.payment||null,
  })
  validateWalletRouting({
    issuerWalletId:ctx.issuerWalletId,issuerWalletVerified:ctx.issuerWalletVerified,
    providerWalletId:account.walletId,
    providerAccount:{providerId:authenticatedProviderId,walletId:account.walletId,
      environment:account.environment,verified:account.verified},
    assignedProviderId:service.proveedor_id,environment:'sandbox',
  })
  if(ctx.customerLink?.environment!=='sandbox' ||
      !ID.test(ctx.customerLink?.asaasCustomerId||'') ||
      ctx.customerLink.ugoClientId!==service.cliente_id)
    throw Error('Asaas payer linkage missing or invalid')

  const inspectExisting=async paymentId=>{
    if(!ID.test(paymentId||'')) throw Error('Invalid reserved Pix payment')
    const p=await asaas.getCharge(paymentId)
    const status=reconcileAuthenticatedPix({
      payment:p,expected:{paymentId,serviceReference:paymentReference,
        customerId:ctx.customerLink.asaasCustomerId,amountBRL:service.tarifa},
    })
    if(status.kind!=='pending') throw Error('Existing charge is not awaiting payment')
    return Object.freeze({state:'awaiting_payment',paymentId,qr:await asaas.getQr(paymentId),reused:true})
  }
  if(eligibility.mode==='reuse_pending') return inspectExisting(eligibility.paymentId)

  // The repository must lock/reserve atomically. Never trust a mere SELECT:
  // two concurrent providers/connections otherwise create duplicate charges.
  const reservation=await repo.reservePix({
    serviceId,providerId:authenticatedProviderId,amountBRL:service.tarifa,
  })
  if(reservation?.mode==='existing') return inspectExisting(reservation.paymentId)
  if(reservation?.mode!=='reserved' || !ID.test(reservation.reservationId||''))
    throw Error('Pix reservation requires reconciliation')
  let processorWasCalled=false
  try {
    processorWasCalled=true
    const charge=await asaas.createChargeWithSplit({
      customerId:ctx.customerLink.asaasCustomerId,amountBRL:service.tarifa,dueDate,
      serviceReference:paymentReference,providerWalletId:account.walletId,providerSharePercent,
      issuerWalletId:ctx.issuerWalletId,issuerWalletVerified:ctx.issuerWalletVerified,
      assignedProviderId:authenticatedProviderId,
      providerAccount:{providerId:authenticatedProviderId,walletId:account.walletId,
        environment:'sandbox',verified:account.verified},
    })
    if(!ID.test(charge?.id||'')) throw Error('Asaas returned no payment identifier')
    await repo.recordProcessorCharge({reservationId:reservation.reservationId,paymentId:charge.id,
      customerId:ctx.customerLink.asaasCustomerId,providerWalletId:account.walletId})
    const qr=await asaas.getQr(charge.id)
    return Object.freeze({state:'awaiting_payment',paymentId:charge.id,qr,reused:false})
  } catch(e) {
    // Unknown outcome, including persistence failure after creating charge.
    // DO NOT retry automatically. Reconcile by reference/payment ID first.
    if(processorWasCalled) {
      await repo.markUncertain({reservationId:reservation.reservationId}).catch(()=>{})
    }
    throw Error('Pix creation uncertain; manual or background reconciliation required')
  }
}
