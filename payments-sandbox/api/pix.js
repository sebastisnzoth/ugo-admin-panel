import { timingSafeEqual } from 'node:crypto'
import pg from 'pg'
const { Client } = pg
const BASE = 'https://api-sandbox.asaas.com/v3'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID = /^[a-zA-Z0-9_-]{1,100}$/
const json = (res,code,payload) => {
 res.statusCode=code
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Content-Type','application/json')
 res.end(JSON.stringify(payload))
}
function auth(header,secret){
 if(typeof header!=='string'||typeof secret!=='string'||!header.startsWith('Bearer '))return false
 const a=Buffer.from(header.slice(7)),b=Buffer.from(secret)
 return a.length===b.length&&timingSafeEqual(a,b)
}
async function processor(path,method='GET',body){
 const r=await fetch(BASE+path,{method,headers:{
  access_token:process.env.ASAAS_SANDBOX_API_KEY,
  accept:'application/json','Content-Type':'application/json',
  'User-Agent':'UGO-Pix-Sandbox-E2E/0.1',
 },...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)})
 if(!r.ok)throw Error('asaas_http_'+r.status)
 const data=await r.json()
 if(!data||typeof data!=='object')throw Error('invalid_asaas_response')
 return data
}
async function preflight(){
 const expected=process.env.UGO_ASAAS_ISSUER_WALLET_ID
 if(!UUID.test(expected||''))throw Error('wallet_not_configured')
 const wallets=await processor('/wallets/')
 if(!Array.isArray(wallets.data)||wallets.data.length!==1||
     String(wallets.data[0]?.id||'').toLowerCase()!==expected.toLowerCase())
  throw Error('issuer_wallet_not_verified')
 const customers=await processor('/customers?limit=2&offset=0')
 if(!Array.isArray(customers.data)||typeof customers.hasMore!=='boolean'||
    customers.hasMore||customers.data.length!==1||!/^cus_[a-zA-Z0-9_-]{1,96}$/.test(customers.data[0]?.id||''))
  throw Error('single_sandbox_customer_not_verified')
 return customers.data[0].id
}
async function dbConnect(){
 const db=new Client({connectionString:process.env.UGO_NEON_TEST_WRITE_URL,
  connectionTimeoutMillis:6000,query_timeout:6000,statement_timeout:6000})
 await db.connect()
 const meta=await db.query(`select current_database() as db,current_user as role,
   pg_has_role(current_user,'neon_superuser','member') as privileged`)
 if(meta.rows[0]?.db!=='neondb'||meta.rows[0]?.role!=='ugo_payments_sandbox_rw'||
    meta.rows[0]?.privileged!==false){await db.end();throw Error('not_isolated_test_role')}
 return db
}
async function existing(db){
 const r=await db.query(`select id, status, asaas_payment_id, asaas_customer_id,
     external_reference, gross_cents, net_cents
   from ugo_payments_v2.payment_intents where ugo_service_id=$1 and environment='sandbox'`,
   [process.env.UGO_PIX_TEST_SERVICE_ID])
 return r.rows[0]||null
}
async function reserve(db,customerId){
 await db.query('BEGIN')
 try{
  const s=await db.query(`select id,cliente_id,proveedor_id,estado,tarifa_cents,moneda
   from ugo_payments_v2.test_services where id=$1 for update`,
   [process.env.UGO_PIX_TEST_SERVICE_ID])
  const svc=s.rows[0]
  if(!svc||svc.estado!=='completado'||svc.moneda!=='BRL'||
     Number(svc.tarifa_cents)!==10000)throw Error('invalid_synthetic_service')
  const old=await existing(db)
  if(old){await db.query('COMMIT');return {existing:old}}
  const ref='ugo_pix_test_'+svc.id.replace(/-/g,'')
  const inserted=await db.query(`insert into ugo_payments_v2.payment_intents
    (id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,status,
     environment,external_reference,asaas_customer_id,provider_share_bps)
    values(gen_random_uuid(),$1,$2,$3,10000,'creating','sandbox',$4,$5,8500)
    returning id,external_reference`,
   [svc.id,svc.cliente_id,svc.proveedor_id,ref,customerId])
  await db.query('COMMIT')
  return inserted.rows[0]
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
}
async function getVerifiedPayment(row){
 if(!row?.asaas_payment_id||!ID.test(row.asaas_payment_id))throw Error('processor_id_missing')
 const p=await processor('/payments/'+encodeURIComponent(row.asaas_payment_id))
 if(p.id!==row.asaas_payment_id||p.externalReference!==row.external_reference||
    p.customer!==row.asaas_customer_id||p.billingType!=='PIX'||
    Math.round(Number(p.value)*100)!==10000)throw Error('processor_identity_mismatch')
 return p
}
function settlement(p){
 const status=p.status
 if(!['PENDING','CONFIRMED','RECEIVED'].includes(status))
  return {processorStatus:status,requiresManualReview:true,splitSettled:false,providerPaid:false}
 const netCents=status==='RECEIVED'&&Number.isFinite(Number(p.netValue))?
    Math.round(Number(p.netValue)*100):null
 const projection=Number.isSafeInteger(netCents)&&netCents>0&&netCents<=10000?
   {mode:'LOCAL_SIMULATION_ONLY',netCents,
    providerCents:Math.floor((netCents*85+50)/100),
    ugoCents:netCents-Math.floor((netCents*85+50)/100)}:null
 return {processorStatus:status,projection,splitSettled:false,providerPaid:false,escrowAvailable:false}
}
async function sync(db,row,p){
 const map={PENDING:'pending',CONFIRMED:'confirmed',RECEIVED:'received'}
 const state=map[p.status]||'manual_review'
 const net=p.status==='RECEIVED'?Math.round(Number(p.netValue)*100):null
 if(net!==null&&(!Number.isSafeInteger(net)||net<=0||net>10000))throw Error('net_value_invalid')
 const result=await db.query(`update ugo_payments_v2.payment_intents
  set status=$2,net_cents=coalesce($3,net_cents),last_reconciled_at=now(),updated_at=now()
  where id=$1 and status in ('pending','confirmed','unknown_processor_result','received')
  returning id`,[row.id,state,net])
 if(result.rows.length!==1)throw Error('invalid_reconciliation_transition')
 // This is a local authenticated reconciliation marker, NOT a received Asaas webhook.
 await db.query(`insert into ugo_payments_v2.payment_events
  (event_id,processor_payment_id,kind,status,processed_at)
  values($1,$2,$3,'processed',now()) on conflict (event_id) do nothing`,
  ['local_reconcile_'+p.id+'_'+p.status,p.id,'UGO_LOCAL_AUTHENTICATED_RECONCILIATION'])
 return settlement(p)
}
async function create(db){
 const customerId=await preflight()
 const reservation=await reserve(db,customerId)
 if(reservation.existing){
  const prior=reservation.existing
  if(prior.status!=='pending'||!prior.asaas_payment_id)
   throw Error('existing_reservation_requires_reconciliation')
  const payment=await getVerifiedPayment(prior)
  if(payment.status!=='PENDING')throw Error('existing_charge_state_requires_reconciliation')
  const savedQr=await processor('/payments/'+encodeURIComponent(payment.id)+'/pixQrCode')
  if(typeof savedQr.payload!=='string'||typeof savedQr.encodedImage!=='string')
   throw Error('existing_qr_unavailable')
  return {action:'reused',paymentId:payment.id,processorStatus:'PENDING',
   qrCopyPaste:savedQr.payload,qrImageBase64:savedQr.encodedImage,
   splitSettled:false,providerPaid:false}
 }
 let charge
 try {
  const due=new Date(Date.now()+86400000*7).toISOString().slice(0,10)
  charge=await processor('/payments','POST',{customer:customerId,billingType:'PIX',
   value:100,dueDate:due,externalReference:reservation.external_reference})
  if(!ID.test(charge.id||''))throw Error('asaas_missing_payment_id')
  const saved=await db.query(`update ugo_payments_v2.payment_intents
   set asaas_payment_id=$2,status='pending',updated_at=now()
   where id=$1 and status='creating' and asaas_payment_id is null returning id`,
   [reservation.id,charge.id])
  if(saved.rows.length!==1)throw Error('processor_charge_not_persisted')
 }catch(e){
  await db.query(`update ugo_payments_v2.payment_intents set
   status='unknown_processor_result',updated_at=now()
   where id=$1 and status='creating'`,[reservation.id]).catch(()=>{})
  throw Error('create_uncertain_stop_and_reconcile')
 }
 const qr=await processor('/payments/'+encodeURIComponent(charge.id)+'/pixQrCode')
 if(typeof qr.payload!=='string'||typeof qr.encodedImage!=='string')throw Error('qr_not_ready_payment_persisted')
 return {action:'created',paymentId:charge.id,processorStatus:charge.status||'PENDING',
  qrCopyPaste:qr.payload,qrImageBase64:qr.encodedImage,
  splitSettled:false,providerPaid:false}
}
async function confirm(db){
 const row=await existing(db)
 if(!row)throw Error('no_reserved_payment')
 const p=await getVerifiedPayment(row)
 if(['CONFIRMED','RECEIVED'].includes(p.status))
  return {action:'already_confirmed',paymentId:p.id,...await sync(db,row,p)}
 if(row.status!=='pending'||p.status!=='PENDING')
  throw Error('not_confirmable_reconcile_required')
 const lock=await db.query(`update ugo_payments_v2.payment_intents
   set status='unknown_processor_result',updated_at=now()
   where id=$1 and status='pending' returning id`,[row.id])
 if(lock.rows.length!==1)throw Error('another_confirmation_in_progress')
 try{await processor('/sandbox/payment/'+encodeURIComponent(p.id)+'/confirm','POST')}
 catch{throw Error('confirmation_uncertain_reconcile_without_retry')}
 const verified=await getVerifiedPayment(row)
 return {action:'confirmed',paymentId:verified.id,...await sync(db,row,verified)}
}
async function reconcile(db){
 const row=await existing(db)
 if(!row)throw Error('no_reserved_payment')
 const p=await getVerifiedPayment(row)
 return {action:'reconciled',paymentId:p.id,...await sync(db,row,p)}
}
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'post_only'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
  return json(res,503,{error:'sandbox_disabled'})
 if(!process.env.UGO_TEST_OPERATOR_TOKEN||!process.env.ASAAS_SANDBOX_API_KEY||
    !process.env.UGO_NEON_TEST_WRITE_URL||!UUID.test(process.env.UGO_PIX_TEST_SERVICE_ID||''))
  return json(res,503,{error:'sandbox_backend_not_configured'})
 if(!auth(req.headers.authorization,process.env.UGO_TEST_OPERATOR_TOKEN))
  return json(res,401,{error:'unauthorized'})
 const action=req.body?.action
 if(!['create','confirm','reconcile'].includes(action))
  return json(res,400,{error:'invalid_action'})
 let db
 try{
  db=await dbConnect()
  const result=action==='create'?await create(db):
    action==='confirm'?await confirm(db):await reconcile(db)
  return json(res,200,{environment:'sandbox',...result})
 }catch(e){
  // No secret, customer data, QR, or raw processor body is ever logged.
  const code=String(e?.message||'sandbox_failed')
  return json(res,409,{environment:'sandbox',error:code})
 }finally{if(db)await db.end().catch(()=>{})}
}
