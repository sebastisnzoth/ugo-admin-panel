/**
 * TEST-only processor reconciliation worker.
 * No public route, no Supabase access, no ledger credit and no split settlement.
 * DB MUST be a private isolated payments TEST connection that exposes
 * db.transaction(async tx => tx.query(sql, params)).
 * asaas.getCharge MUST use an authenticated Asaas Sandbox backend client.
 */
import { reconcileAuthenticatedPix } from './asaasPixReconciliation.mjs'

const eventIdIsValid=x=>typeof x==='string'&&x.length>0&&x.length<=160&&
  ![...x].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)
const ID=/^[A-Za-z0-9_-]{1,100}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const lockedSql=`select e.event_id,e.kind,e.processor_payment_id,e.status as event_status,
 i.id as intent_id,i.status as payment_status,i.asaas_payment_id,
 i.asaas_customer_id,i.asaas_provider_wallet_id,i.external_reference,
 i.gross_cents,i.net_cents
 from ugo_payments_v2.payment_events e
 join ugo_payments_v2.payment_intents i
   on i.asaas_payment_id=e.processor_payment_id and i.environment='sandbox'
 where e.event_id=$1
 for update of e,i`

export async function reconcileStoredAsaasSandboxEvent({db,asaas,eventId}) {
 if(!eventIdIsValid(eventId)) throw Error('Invalid Asaas event ID')
 if(typeof db?.transaction!=='function'||typeof db?.query!=='function')
   throw Error('Private transactional TEST database is required')
 if(typeof asaas?.getCharge!=='function') throw Error('Authenticated Asaas Sandbox client required')
 // Read the already-authenticated inbox row and require a known local charge,
 // BEFORE making any request to the processor (avoids arbitrary-ID API lookups).
 const preliminary=await db.query(`select e.processor_payment_id,e.status,i.id as intent_id,
 i.asaas_customer_id,i.asaas_provider_wallet_id,i.external_reference,i.gross_cents
 from ugo_payments_v2.payment_events e
 join ugo_payments_v2.payment_intents i
 on i.asaas_payment_id=e.processor_payment_id and i.environment='sandbox'
 where e.event_id=$1`,[eventId])
 const first=preliminary.rows[0]
 if(!first) throw Error('Unknown Asaas payment event requires manual review')
 if(first.status==='processed')return {kind:'duplicate'}
 if(first.kind.startsWith('PAYMENT_SPLIT_'))
   throw Error('Split event requires independent settlement reconciliation')
 if(first.status!=='received')throw Error('Asaas event is not ready for reconciliation')
 if(!ID.test(first.processor_payment_id||'')||
   !ID.test(first.asaas_customer_id||'')||
   !ID.test(first.external_reference||'')||
   !UUID.test(first.asaas_provider_wallet_id||'')||
   !Number.isSafeInteger(Number(first.gross_cents))||Number(first.gross_cents)<=0)
   throw Error('Incomplete persisted TEST payment metadata')
 // Never take values or payment state from the incoming webhook.
 const processor=await asaas.getCharge(first.processor_payment_id)
 const verified=reconcileAuthenticatedPix({payment:processor,expected:{
   paymentId:first.processor_payment_id,
   serviceReference:first.external_reference,
   customerId:first.asaas_customer_id,
   amountBRL:Number(first.gross_cents)/100,
 }})
 return db.transaction(async tx=>{
   const rows=(await tx.query(lockedSql,[eventId])).rows
   if(rows.length!==1)throw Error('Payment disappeared during reconciliation')
   const current=rows[0]
   if(current.event_status==='processed')return {kind:'duplicate'}
   if(current.event_status!=='received'||current.intent_id!==first.intent_id||
      current.processor_payment_id!==first.processor_payment_id||
      current.asaas_customer_id!==first.asaas_customer_id||
      current.asaas_provider_wallet_id!==first.asaas_provider_wallet_id||
      current.external_reference!==first.external_reference||
      Number(current.gross_cents)!==Number(first.gross_cents))
     throw Error('Concurrent financial metadata change requires manual review')
   let nextStatus
   if(verified.kind==='received')nextStatus='received'
   else if(verified.kind==='confirmed_not_settled')nextStatus='confirmed'
   else if(verified.kind==='review')nextStatus='manual_review'
   else if(verified.kind==='unpaid')nextStatus='expired'
   else if(verified.kind==='pending')nextStatus='pending'
   else throw Error('Unrecognized authenticated Asaas state')
   if(['received','confirmed'].includes(current.payment_status)&&
      ['pending','expired'].includes(nextStatus))
     throw Error('Processor state regression requires manual review')
   if(current.payment_status==='manual_review'&&nextStatus!=='manual_review')
     throw Error('Manual financial review cannot be bypassed')
   const netCents=verified.kind==='received'?verified.netCents:null
   if(current.net_cents!==null&&netCents!==null&&
      Number(current.net_cents)!==netCents)
     throw Error('Received net amount changed: manual review required')
   const updated=await tx.query(`update ugo_payments_v2.payment_intents
     set status=$2,net_cents=coalesce($3,net_cents),
         last_reconciled_at=now(),updated_at=now()
     where id=$1 returning id`,[current.intent_id,nextStatus,netCents])
   if(updated.rows.length!==1)throw Error('Financial reconciliation write failed')
   const done=await tx.query(`update ugo_payments_v2.payment_events
     set status='processed',processed_at=now()
     where event_id=$1 and status='received' returning event_id`,[eventId])
   if(done.rows.length!==1)throw Error('Webhook process marker failed')
   // A verified received payment IS NOT proof of settled split, payout or escrow.
   return {kind:verified.kind,paymentState:nextStatus,
     splitSettled:false,escrowReleased:false}
 })
}
