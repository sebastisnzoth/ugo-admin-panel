/**
 * Pure SQL-backed repository adapter for the isolated Neon Pagamentos V2 TEST
 * project. Requires a dedicated least-privilege DB connection. NO Supabase
 * client or production connection is imported or permitted.
 *
 * IMPORTANT: this is not a public endpoint. The invoking server MUST verify
 * provider auth, limit requests and use a sandbox-only processor key.
 */
import { randomUUID } from 'node:crypto'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID=/^[A-Za-z0-9_-]{1,100}$/
const cents=value=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||
    Math.abs(Math.round(value*100)-value*100)>1e-7) throw Error('Invalid BRL tariff')
 return Math.round(value*100)
}
function requireUUID(id,label){if(typeof id!=='string'||!UUID.test(id))throw Error('Invalid '+label);return id}
function requirePaymentId(id){if(typeof id!=='string'||!ID.test(id))throw Error('Invalid processor payment id');return id}

export class NeonPixTestRepository {
 constructor({db,issuerWalletId,walletVerifier}) {
  if(!db||typeof db.query!=='function')throw Error('Isolated SQL connection required')
  if(typeof walletVerifier?.verifyIssuerWallet!=='function')throw Error('Authenticated Asaas wallet verifier required')
  requireUUID(issuerWalletId,'issuer wallet')
  this.db=db
  this.issuerWalletId=issuerWalletId
  this.walletVerifier=walletVerifier
 }
 async loadFixture(serviceId){
  requireUUID(serviceId,'service')
  const result=await this.db.query(`select
    s.id,s.cliente_id,s.proveedor_id,s.estado,s.moneda,s.tarifa_cents,
    c.asaas_customer_id,c.environment as customer_environment,
    p.asaas_wallet_id,p.environment as provider_environment,
    p.verified_at,p.kyc_approved_at
   from ugo_payments_v2.test_services s
   left join ugo_payments_v2.customer_links c
     on c.ugo_client_id=s.cliente_id and c.environment='sandbox'
   left join ugo_payments_v2.provider_accounts p
     on p.ugo_provider_id=s.proveedor_id and p.environment='sandbox'
   where s.id=$1`,[serviceId])
  if(result.rows.length!==1)throw Error('Synthetic TEST service not found')
  return result.rows[0]
 }
 async loadContext(serviceId){
  const service=await this.loadFixture(serviceId)
  const verified=await this.walletVerifier.verifyIssuerWallet(this.issuerWalletId)
  if(verified?.environment!=='sandbox'||verified?.verified!==true||
     verified.walletId?.toLowerCase()!==this.issuerWalletId.toLowerCase())
    throw Error('Sandbox issuer wallet authentication failed')
  const r=await this.db.query(`select id,status,asaas_payment_id,qr_expires_at
    from ugo_payments_v2.payment_intents
    where ugo_service_id=$1 and environment='sandbox'`,[serviceId])
  const attempt=r.rows[0]
  return {
    service:{id:service.id,cliente_id:service.cliente_id,proveedor_id:service.proveedor_id,
      estado:service.estado,moneda:service.moneda,tarifa:Number(service.tarifa_cents)/100},
    providerAccount:{
      proveedor_id:service.proveedor_id,walletId:String(service.asaas_wallet_id||''),
      verified:!!service.verified_at&&!!service.kyc_approved_at,
      environment:service.provider_environment||'sandbox',
    },
    issuerWalletId:verified.walletId,issuerWalletVerified:true,
    customerLink:{ugoClientId:service.cliente_id,
      asaasCustomerId:service.asaas_customer_id,
      environment:service.customer_environment||'sandbox'},
    payment:attempt?{state:attempt.status,processorPaymentId:attempt.asaas_payment_id,
      expiresAt:attempt.qr_expires_at}:null,
  }
 }
 async reservePix({serviceId,providerId,amountBRL}){
  requireUUID(serviceId,'service')
  requireUUID(providerId,'provider')
  const fixture=await this.loadFixture(serviceId)
  if(fixture.proveedor_id!==providerId||Number(fixture.tarifa_cents)!==cents(amountBRL)||
    !['completado','esperando_aprobacion'].includes(fixture.estado))
    throw Error('Synthetic service owner or tariff mismatch')
  const reference='ugo_test_'+serviceId.replace(/-/g,'')
  const result=await this.db.query(`select * from ugo_payments_v2.reserve_pix_test($1,$2,$3,$4,$5,$6)`,[
    randomUUID(),serviceId,fixture.cliente_id,providerId,fixture.tarifa_cents,reference,
  ])
  if(result.rows.length!==1)throw Error('Invalid atomic Pix reservation response')
  const row=result.rows[0]
  if(row.mode==='reserved')return {mode:'reserved',reservationId:row.intent_id}
  if(row.mode==='existing'&&row.processor_payment_id)
    return {mode:'existing',paymentId:row.processor_payment_id}
  return {mode:'reconcile'}
 }
 async recordProcessorCharge({reservationId,paymentId}){
  requireUUID(reservationId,'reservation')
  requirePaymentId(paymentId)
  const result=await this.db.query(`update ugo_payments_v2.payment_intents
   set asaas_payment_id=$2,status='pending',updated_at=now()
   where id=$1 and status='creating' and asaas_payment_id is null
   returning id`,[reservationId,paymentId])
  if(result.rows.length!==1)throw Error('Charge persistence conflict; reconcile')
 }
 async markUncertain({reservationId}){
  requireUUID(reservationId,'reservation')
  await this.db.query(`update ugo_payments_v2.payment_intents
   set status='unknown_processor_result',updated_at=now()
   where id=$1 and status in ('creating','pending')`,[reservationId])
 }
}
