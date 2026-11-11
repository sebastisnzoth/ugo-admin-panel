/**
 * Authenticated Asaas Sandbox webhook reconciliation for the single TEST fixture.
 * Never creates charges, marks service completed, posts split or pays providers.
 * All payment transitions depend on a fresh authenticated GET from Asaas.
 */
const PAYMENT_ID=/^[A-Za-z0-9_-]{1,100}$/
const ALLOWED_EVENTS=new Set(['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'])
export async function reconcileInboxEvent({db,eventId,asaasGet}){
 if(typeof db?.query!=='function'||typeof asaasGet!=='function')
  throw Error('webhook_reconciliation_dependencies_required')
 if(typeof eventId!=='string'||!eventId||eventId.length>160||
   [...eventId].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))
  throw Error('invalid_webhook_event_id')
 await db.query('BEGIN')
 try{
  const found=await db.query(`select event_id,kind,processor_payment_id,status
    from ugo_payments_v2.payment_events where event_id=$1 for update`,[eventId])
  const e=found.rows[0]
  if(!e||!ALLOWED_EVENTS.has(e.kind)||!PAYMENT_ID.test(e.processor_payment_id||''))
   throw Error('webhook_event_requires_review')
  if(e.status==='processed'){
   await db.query('COMMIT')
   return {state:'duplicate',receivedVerified:false,splitSettled:false,providerPaid:false}
  }
  if(e.status!=='received')throw Error('webhook_event_requires_review')
  const intentResult=await db.query(`select id,asaas_payment_id,asaas_customer_id,
     external_reference,gross_cents,net_cents,status
     from ugo_payments_v2.payment_intents
     where asaas_payment_id=$1 and environment='sandbox'
     for update`,[e.processor_payment_id])
  if(intentResult.rows.length!==1)throw Error('webhook_payment_not_linked')
  const intent=intentResult.rows[0]
  const p=await asaasGet(e.processor_payment_id)
  if(!p||p.id!==intent.asaas_payment_id||
     p.customer!==intent.asaas_customer_id||
     p.externalReference!==intent.external_reference||
     p.billingType!=='PIX'||!Number.isSafeInteger(Number(intent.gross_cents))||
     Math.round(Number(p.value)*100)!==Number(intent.gross_cents))
   throw Error('webhook_processor_identity_mismatch')
  // A CONFIRMED event may arrive after RECEIVED. Always use fresh remote
  // state and never regress an already received payment.
  if(e.kind==='PAYMENT_RECEIVED'&&p.status!=='RECEIVED'||
     e.kind==='PAYMENT_CONFIRMED'&&!['CONFIRMED','RECEIVED'].includes(p.status))
   throw Error('webhook_processor_not_confirmed')
  const state=p.status==='RECEIVED'?'received':'confirmed'
  const previous=String(intent.status||'')
  if(!['pending','confirmed','received','unknown_processor_result'].includes(previous))
   throw Error('webhook_payment_state_requires_review')
  if(previous==='received'&&state!=='received')
   throw Error('webhook_processor_state_regression')
  const net=state==='received'?Math.round(Number(p.netValue)*100):null
  if(net!==null&&(!Number.isSafeInteger(net)||net<=0||
    net>Number(intent.gross_cents)||
    intent.net_cents!=null&&Number(intent.net_cents)!==net))
   throw Error('webhook_processor_net_invalid')
  const updated=await db.query(`update ugo_payments_v2.payment_intents
   set status=$2,net_cents=coalesce($3,net_cents),
    last_reconciled_at=now(),updated_at=now()
   where id=$1 and environment='sandbox'
    and status in ('pending','confirmed','received','unknown_processor_result')
   returning id`,[intent.id,state,net])
  if(updated.rows.length!==1)throw Error('webhook_intent_update_failed')
  const done=await db.query(`update ugo_payments_v2.payment_events
    set status='processed',processed_at=now()
    where event_id=$1 and status='received' returning event_id`,[eventId])
  if(done.rows.length!==1)throw Error('webhook_event_processing_conflict')
  await db.query('COMMIT')
  return {state,receivedVerified:state==='received',
   splitSettled:false,providerPaid:false}
 }catch(e){
  await db.query('ROLLBACK').catch(()=>{})
  throw e
 }
}
