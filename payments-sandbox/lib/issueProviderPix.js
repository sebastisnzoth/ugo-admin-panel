/**
 * Guarded provider TEST issuance, not a payment release or payout.
 * The caller MUST first authenticate the provider JWT, verify row ownership,
 * strict sandbox allowlist, deferred-Pix flags, and final evidence.
 *
 * A locally reserved "creating" intent is NEVER retried automatically:
 * ambiguous Asaas POST results require independent operator reconciliation.
 */
import {UUID} from './providerPixProof.js'
import {sandboxChargeSpec,remoteReferenceAbsent,issuedChargeIdentityValid} from './providerPixIssue.js'

export async function issueProviderPix({db,service,providerId,asaasGet,asaasCreate,issuerWalletId}){
 if(typeof db?.query!=='function'||typeof asaasGet!=='function'||
    typeof asaasCreate!=='function'||!UUID.test(issuerWalletId||''))
  throw Error('issuer_wallet_missing')
 const wallets=await asaasGet('/wallets/')
 if(!Array.isArray(wallets?.data)||wallets.data.length!==1||
    wallets.data[0]?.id!==issuerWalletId)
  throw Error('issuer_wallet_not_verified')
 const customers=await asaasGet('/customers?limit=2&offset=0')
 if(!Array.isArray(customers?.data)||customers.data.length!==1||
    customers.hasMore!==false)
  throw Error('sandbox_payer_not_unique')
 const customer=customers.data[0]
 if(!/^cus_[A-Za-z0-9_-]{1,96}$/.test(customer?.id||'')||
    !/^\d{11}(?:\d{3})?$/.test(String(customer.cpfCnpj||''))||
    customer.notificationDisabled!==true)
  throw Error('sandbox_payer_not_ready')
 const spec=sandboxChargeSpec(service,customer.id)
 let intentId
 await db.query('BEGIN')
 try{
  // Concurrent callers serialize on the same persisted TEST service row.
  await db.query(
   "insert into ugo_payments_v2.test_services "+
   "(id,cliente_id,proveedor_id,estado,tarifa_cents,moneda) "+
   "values ($1,$2,$3,$4,$5,'BRL') on conflict (id) do nothing",
   [service.id,service.cliente_id,providerId,service.estado,spec.grossCents])
  const r=await db.query(
   "select id,cliente_id,proveedor_id,estado,tarifa_cents,moneda "+
   "from ugo_payments_v2.test_services where id=$1 for update",[service.id])
  const row=r.rows[0]
  if(r.rows.length!==1||row.cliente_id!==service.cliente_id||
     row.proveedor_id!==providerId||row.moneda!=='BRL'||
     Number(row.tarifa_cents)!==spec.grossCents||
     !['esperando_aprobacion','completado'].includes(row.estado))
   throw Error('test_service_identity_mismatch')
  const prior=await db.query(
   "select id,ugo_client_id,ugo_provider_id,gross_cents,status,"+
   "external_reference,asaas_payment_id from ugo_payments_v2.payment_intents "+
   "where ugo_service_id=$1 and environment='sandbox' for update",[service.id])
  if(prior.rows.length){
   const old=prior.rows[0]
   if(prior.rows.length!==1||old.ugo_client_id!==service.cliente_id||
      old.ugo_provider_id!==providerId||
      Number(old.gross_cents)!==spec.grossCents||
      old.external_reference!==spec.externalReference||
      old.status!=='pending'||!old.asaas_payment_id)
    throw Error('existing_intent_requires_reconciliation')
   await db.query('COMMIT')
   return {created:false}
  }
  const inserted=await db.query(
   "insert into ugo_payments_v2.payment_intents "+
   "(id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,status,"+
   "environment,external_reference,asaas_customer_id,provider_share_bps) "+
   "values(gen_random_uuid(),$1,$2,$3,$4,'creating','sandbox',$5,$6,8500) returning id",
   [service.id,service.cliente_id,providerId,spec.grossCents,
    spec.externalReference,customer.id])
  if(inserted.rows.length!==1)throw Error('reservation_not_persisted')
  intentId=inserted.rows[0].id
  await db.query('COMMIT')
 }catch(error){
  await db.query('ROLLBACK').catch(()=>{})
  throw error
 }
 try{
  const existing=await asaasGet('/payments?limit=2&offset=0&externalReference='+
   encodeURIComponent(spec.externalReference))
  if(!remoteReferenceAbsent(existing,spec.externalReference))
   throw Error('remote_reference_requires_review')
  const charge=await asaasCreate(spec.paymentBody)
  if(!issuedChargeIdentityValid(charge,spec))
   throw Error('processor_result_uncertain')
  const saved=await db.query(
   "update ugo_payments_v2.payment_intents "+
   "set asaas_payment_id=$2,status='pending',updated_at=now() "+
   "where id=$1 and status='creating' and asaas_payment_id is null returning id",
   [intentId,charge.id])
  if(saved.rows.length!==1)throw Error('processor_result_uncertain')
  return {created:true}
 }catch(error){
  // A prior possible charge must never be repeated. Keep manual review
  // for known processor 4xx, and unknown_processor_result for uncertainty.
  const raw=String(error?.message||'')
  const manual=raw==='processor_rejected'||raw==='remote_reference_requires_review'
  await db.query(
   "update ugo_payments_v2.payment_intents set status=$2,updated_at=now() "+
   "where id=$1 and status='creating'",
   [intentId,manual?'manual_review':'unknown_processor_result']).catch(()=>{})
  throw error
 }
}
