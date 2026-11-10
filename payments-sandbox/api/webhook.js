/**
 * Asaas SANDBOX webhook inbox for isolated UGO Payments Preview.
 * A 200 means ONLY that the event was durably stored, not that money was paid out.
 */
import { timingSafeEqual, createHash } from 'node:crypto'
import pg from 'pg'
import {reconcileInboxEvent} from '../lib/reconcileInboxEvent.js'
const {Client}=pg
const ID=/^[a-zA-Z0-9_-]{1,160}$/
const eventIdValid=x=>typeof x==='string'&&x.length>0&&x.length<=160&&
 ![...x].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)
function send(res,code,payload){
 res.statusCode=code
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Content-Type','application/json')
 res.end(JSON.stringify(payload))
}
function matchToken(actual,expected){
 if(typeof actual!=='string'||typeof expected!=='string'||actual.length<32||
    expected.length<32||actual.length>255||expected.length>255)return false
 const a=createHash('sha256').update(actual).digest()
 const b=createHash('sha256').update(expected).digest()
 return timingSafeEqual(a,b)
}
export default async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'method_not_allowed'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
  return send(res,503,{error:'sandbox_disabled'})
 if(!process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN||
    !process.env.UGO_NEON_TEST_WRITE_URL)
  return send(res,503,{error:'sandbox_backend_not_configured'})
 if(!matchToken(req.headers['asaas-access-token'],process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN))
  return send(res,401,{error:'unauthorized'})
 // Vercel parses application/json by default. Bound the original request length
 // when available and also the serialized body to avoid oversized inbox payloads.
 const length=Number(req.headers['content-length']||0)
 if(!Number.isSafeInteger(length)||length<0||length>65536)
  return send(res,413,{error:'body_too_large'})
 const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??null)
 if(Buffer.byteLength(raw,'utf8')>65536)return send(res,413,{error:'body_too_large'})
 let event
 try{event=JSON.parse(raw)}catch{return send(res,400,{error:'invalid_json'})}
 if(!event||Array.isArray(event)||typeof event!=='object'||
    !eventIdValid(event.id)||!ID.test(event.event||'')||
    !ID.test(event.payment?.id||'')||!event.event.startsWith('PAYMENT_'))
  return send(res,400,{error:'invalid_event'})
 let db
 try{
  db=new Client({connectionString:process.env.UGO_NEON_TEST_WRITE_URL,
   connectionTimeoutMillis:6000,query_timeout:6000,statement_timeout:6000})
  await db.connect()
  const meta=await db.query(`select current_database() as db,current_user as role,
    pg_has_role(current_user,'neon_superuser','member') as privileged`)
  if(meta.rows[0]?.db!=='neondb'||meta.rows[0]?.role!=='ugo_payments_sandbox_rw'||
     meta.rows[0]?.privileged!==false)
   return send(res,503,{error:'not_isolated_test_role'})
  // Never fill the inbox with unrelated payment IDs. A charge can race
  // with its local persistence; return 503 so Asaas can retry later.
  const linked=await db.query(`select id from ugo_payments_v2.payment_intents
    where environment='sandbox' and asaas_payment_id=$1 limit 2`,[event.payment.id])
  if(linked.rows.length!==1)return send(res,503,{error:'payment_not_yet_linked'})
  const written=await db.query(`insert into ugo_payments_v2.payment_events
    (event_id,processor_payment_id,kind,status)
    values($1,$2,$3,'received') on conflict (event_id) do nothing
    returning event_id`,[event.id,event.payment.id,event.event])
  // Conflicting duplicate IDs are never silently acknowledged.
  if(written.rows.length===0){
   const prior=await db.query(`select processor_payment_id,kind
    from ugo_payments_v2.payment_events where event_id=$1`,[event.id])
   if(prior.rows.length!==1||prior.rows[0].processor_payment_id!==event.payment.id||
      prior.rows[0].kind!==event.event)
    return send(res,409,{error:'event_id_conflict'})
  }
  // Process only actual settlement-relevant receipt statuses. Keep other
  // events durably stored for explicit review; no financial state change.
  if(!['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(event.event))
   return send(res,200,{accepted:true,processed:false,reviewRequired:true})
  if(!process.env.ASAAS_SANDBOX_API_KEY)
   return send(res,503,{error:'sandbox_processor_not_configured'})
  const asaasGet=async paymentId=>{
   const response=await fetch('https://api-sandbox.asaas.com/v3/payments/'+
    encodeURIComponent(paymentId),{
     headers:{access_token:process.env.ASAAS_SANDBOX_API_KEY,
      accept:'application/json','User-Agent':'UGO-Pix-Webhook-Sandbox/1.0'},
     signal:AbortSignal.timeout(10000)
    })
   if(!response.ok)throw Error('asaas_readback_unavailable')
   return response.json()
  }
  try{
   const reconciled=await reconcileInboxEvent({db,eventId:event.id,asaasGet})
   return send(res,200,{accepted:true,processed:true,
    receivedVerified:reconciled.receivedVerified,
    duplicate:reconciled.state==='duplicate'})
  }catch{
   // Event is stored but not acknowledged as successfully processed: Asaas
   // retries delivery. Operator reconciliation remains available separately.
   return send(res,503,{error:'webhook_reconciliation_pending'})
  }
 }catch{
  return send(res,503,{error:'inbox_unavailable'})
 }finally{if(db)await db.end().catch(()=>{})}
}
