/**
 * Durable Asaas Sandbox webhook inbox. NOT an HTTP route.
 * Caller must exclusively use the isolated payments TEST DB.
 * Acknowledgement is possible only AFTER a durable INSERT or verifying
 * a previously inserted matching event. This never credits any wallet.
 */
import { verifyAsaasWebhookToken, parseAsaasPaymentEvent } from './asaasWebhookGuard.mjs'

const CAP=64*1024
export async function ingestAsaasSandboxWebhook({method,token,expectedToken,rawBody,db}) {
  if(method!=='POST')return {status:405,body:{error:'method_not_allowed'}}
  if(!verifyAsaasWebhookToken(token,expectedToken))
    return {status:401,body:{error:'unauthorized'}}
  if(!db||typeof db.query!=='function')
    return {status:503,body:{error:'test_store_unavailable'}}
  if(typeof rawBody!=='string'||Buffer.byteLength(rawBody,'utf8')>CAP)
    return {status:413,body:{error:'invalid_body'}}
  let event
  try {
    event=parseAsaasPaymentEvent(JSON.parse(rawBody))
  }catch{
    return {status:400,body:{error:'invalid_event'}}
  }
  try{
    const written=await db.query(`insert into ugo_payments_v2.payment_events
      (event_id,processor_payment_id,kind,status)
      values($1,$2,$3,'received')
      on conflict(event_id) do nothing returning event_id`,
      [event.eventId,event.externalPaymentId,event.kind])
    if(written.rows.length===1)
      return {status:200,body:{accepted:true,duplicate:false}}
    const existing=await db.query(`select processor_payment_id,kind from
      ugo_payments_v2.payment_events where event_id=$1`,[event.eventId])
    if(existing.rows.length!==1 ||
      existing.rows[0].processor_payment_id!==event.externalPaymentId ||
      existing.rows[0].kind!==event.kind)
      return {status:409,body:{error:'event_id_conflict'}}
    return {status:200,body:{accepted:true,duplicate:true}}
  }catch{
    // Never acknowledge an event that could not be durably committed.
    return {status:503,body:{error:'event_persistence_failed'}}
  }
}
