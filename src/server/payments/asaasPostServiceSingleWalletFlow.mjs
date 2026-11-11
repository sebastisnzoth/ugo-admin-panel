/**
 * Post-service single-wallet Pix flow for isolated Sandbox/TEST.
 *
 * All actor, service, evidence, customer and payment context MUST be retrieved
 * and verified server-side. No browser/API route imports this until an
 * authenticated provider adapter and end-to-end test backend exist.
 *
 * In this pilot the processor receives payment in UGO's single Sandbox wallet;
 * provider payout, escrow and 85/15 Asaas split are NOT performed.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID=/^[A-Za-z0-9_-]{1,120}$/
const AMOUNT_LIMIT_CENTS=10_000_000
function validId(id){return typeof id==='string'&&ID.test(id)}
function validUuid(id){return typeof id==='string'&&UUID.test(id)}
function requireTestContext({ctx,providerId,serviceId}){
 const svc=ctx?.service
 if(!validUuid(serviceId)||!validUuid(providerId)||svc?.id!==serviceId||
    svc.proveedor_id!==providerId||!validUuid(svc?.cliente_id))
  throw Error('not_assigned_provider')
 if(svc.ambiente!=='demo'||(svc.moneda||'BRL')!=='BRL'||
    svc.estado!=='esperando_aprobacion'||svc.evidenceVerified!==true||
    svc.pixAfterServiceAuthorized!==true||svc.paymentTiming!=='after_service'||
    svc.paymentMethod!=='pix')
  throw Error('post_service_test_eligibility_required')
 const amount=Number(svc.tarifa)
 const cents=Math.round(amount*100)
 if(!Number.isFinite(amount)||!Number.isSafeInteger(cents)||
    cents<=0||cents>AMOUNT_LIMIT_CENTS||
    Math.abs(amount*100-cents)>1e-7)
  throw Error('server_amount_invalid')
 if(!ctx?.issuerWalletVerified||ctx?.environment!=='sandbox'||
    !validUuid(ctx.issuerWalletId))
  throw Error('sandbox_issuer_unverified')
 if(!validId(ctx.customerId)||!/^cus_/.test(ctx.customerId)||
    ctx.customerClientId!==svc.cliente_id)
  throw Error('sandbox_customer_link_invalid')
 if(!validId(ctx.externalReference)||!ctx.externalReference.startsWith('ugo_'))
  throw Error('canonical_payment_reference_required')
 return amount
}
function verifiedCharge(charge,ctx,paymentId,amount){
 if(!validId(paymentId)||charge?.id!==paymentId||
    charge.customer!==ctx.customerId||
    charge.externalReference!==ctx.externalReference||
    charge.billingType!=='PIX'||Math.round(Number(charge.value)*100)!==Math.round(amount*100))
  throw Error('processor_charge_identity_mismatch')
 if(charge.status!=='PENDING')throw Error('processor_payment_not_pending')
}
function verifiedQr(qr){
 if(typeof qr?.payload!=='string'||qr.payload.length<10||qr.payload.length>4096||
    typeof qr?.encodedImage!=='string'||qr.encodedImage.length<20||
    qr.encodedImage.length>200000||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(qr.encodedImage))
  throw Error('processor_pix_qr_invalid')
 if(qr.expirationDate!=null){
  const exp=Date.parse(qr.expirationDate)
  if(!Number.isFinite(exp)||exp<=Date.now())
   throw Error('processor_pix_qr_expired_reconcile')
 }
 return {qrCopyPaste:qr.payload,qrImageBase64:qr.encodedImage,
  expiresAt:qr.expirationDate||null}
}
/**
 * repo.loadContext and repo.reserve must verify TEST ownership and lock the
 * canonical service+payment intent transactionally. A UI flag is never enough.
 * asaas.createChargeWithoutSplit must be hardwired to api-sandbox.asaas.com.
 */
export async function issuePostServiceSingleWalletPix({
 serviceId,authenticatedProviderId,repo,asaas,dueDate
}){
 if(!repo||!asaas||typeof repo.loadContext!=='function'||
    typeof repo.reserve!=='function'||typeof repo.recordCharge!=='function'||
    typeof repo.markUncertain!=='function'||typeof asaas.getCharge!=='function'||
    typeof asaas.getQr!=='function'||typeof asaas.createChargeWithoutSplit!=='function')
  throw Error('isolated_dependencies_required')
 const ctx=await repo.loadContext(serviceId,authenticatedProviderId)
 const amount= requireTestContext({ctx,providerId:authenticatedProviderId,serviceId})
 const makeResponse=async(paymentId,reused)=>{
  const charge=await asaas.getCharge(paymentId)
  verifiedCharge(charge,ctx,paymentId,amount)
  const qr=verifiedQr(await asaas.getQr(paymentId))
  return Object.freeze({stage:'awaiting_payment',paymentId,reused,...qr,
   environment:'sandbox',splitSettled:false,providerPaid:false,
   escrowAvailable:false})
 }
 const reservation=await repo.reserve({serviceId,providerId:authenticatedProviderId,
  customerId:ctx.customerId,externalReference:ctx.externalReference,
  amountCents:Math.round(amount*100)})
 if(reservation?.mode==='existing'){
  if(!validId(reservation.paymentId))throw Error('linked_processor_id_invalid')
  return makeResponse(reservation.paymentId,true)
 }
 if(reservation?.mode!=='reserved'||!validUuid(reservation.reservationId))
  throw Error('payment_reservation_reconciliation_required')
 let charge
 try{
  charge=await asaas.createChargeWithoutSplit({
   customerId:ctx.customerId,amountBRL:amount,dueDate,
   serviceReference:ctx.externalReference
  },{testOnlyChargeAuthorized:true})
  if(!validId(charge?.id)||charge.customer!==ctx.customerId||
     charge.externalReference!==ctx.externalReference||
     charge.billingType!=='PIX'||Math.round(Number(charge.value)*100)!==Math.round(amount*100))
   throw Error('processor_creation_identity_uncertain')
  await repo.recordCharge({reservationId:reservation.reservationId,
   paymentId:charge.id,customerId:ctx.customerId})
 }catch(error){
  // The processor might have created the charge even when the response failed.
  // A second POST is forbidden until independent reconciliation by reference.
  await repo.markUncertain({reservationId:reservation.reservationId}).catch(()=>{})
  throw Error('processor_creation_uncertain_reconcile_first')
 }
 // A QR retrieval failure after saving the payment is NOT a failed charge:
 // the next request safely reuses the linked payment ID.
 return makeResponse(charge.id,false)
}
