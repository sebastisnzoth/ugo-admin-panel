/**
 * Isolated UGO Pix Sandbox click-through: one synthetic R$100 fixture.
 * No Supabase/Arena calls, no real money, no external split or payout.
 * The Vercel Preview deployment is protected by Vercel Authentication.
 * Additional fail-closed controls: server flag, strict origin, signed
 * same-site HttpOnly session, fixed fixture, Neon TEST role, Asaas Sandbox.
 */
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto'
import pg from 'pg'
import {issueProviderPix} from '../lib/issueProviderPix.js'
import {sandboxChargeSpec,issuedChargeIdentityValid} from '../lib/providerPixIssue.js'
import {pendingQrValid} from '../lib/providerPixProof.js'
const{Client}=pg
const BASE='https://api-sandbox.asaas.com/v3'
const CLIENT='9ab4192c-97fa-44ad-a2b5-54fd6d3cf7f9'
const PROVIDER='6fcc686f-6d1d-461a-a348-3522433f9241'
const AMOUNT=100
// Each signed browser session owns one immutable synthetic service / one test intent.
function sessionFixture(session){
 const hex=createHmac('sha256',process.env.UGO_TEST_OPERATOR_TOKEN)
  .update('ugo_pix_demo_session_service:'+session).digest('hex')
 const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32)
 return {id,cliente_id:CLIENT,proveedor_id:PROVIDER,estado:'completado',tarifa:AMOUNT,moneda:'BRL'}
}
const json=(res,status,body)=>{
 res.statusCode=status
 res.setHeader('Cache-Control','private, no-store, max-age=0')
 res.setHeader('Content-Type','application/json; charset=utf-8')
 res.setHeader('X-Content-Type-Options','nosniff')
 res.end(JSON.stringify(body))
}
function enabled(req){
 const host=(req.headers.host||'').toLowerCase()
 return process.env.VERCEL_ENV==='preview'&&process.env.UGO_PAYMENTS_TEST_ONLY==='1'&&
 process.env.UGO_PIX_DEMO_ENABLED==='1'&&
 typeof process.env.UGO_TEST_OPERATOR_TOKEN==='string'&&process.env.UGO_TEST_OPERATOR_TOKEN.length>=32&&
 typeof process.env.ASAAS_SANDBOX_API_KEY==='string'&&
 host.startsWith('ugo-pagamentos-v2-sandbox-')&&host.endsWith('.vercel.app')
}
function sign(value){return createHmac('sha256',process.env.UGO_TEST_OPERATOR_TOKEN).update(value).digest('hex')}
function authenticate(req,res){
 const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ugo_pix_demo_session='))
 const value=cookie?.slice('ugo_pix_demo_session='.length)||''
 const [ts,nonce,mac]=value.split('.')
 const stamp=Number(ts)
 const valid=Number.isSafeInteger(stamp)&&stamp<=Date.now()&&stamp>Date.now()-3600000&&
  /^[a-f0-9]{32}$/.test(nonce||'')&&/^[a-f0-9]{64}$/.test(mac||'')
 if(valid){
  const a=Buffer.from(mac,'hex'),b=Buffer.from(sign(ts+'.'+nonce),'hex')
  if(a.length===b.length&&timingSafeEqual(a,b))return value
 }
 return false
}
function issueSession(req,res){
 const ts=String(Date.now()),nonce=randomBytes(16).toString('hex')
 const cookie=ts+'.'+nonce+'.'+sign(ts+'.'+nonce)
 // Partitioned cookie allows the same isolated demo to run in UGO Pro's iframe.
 // The signing secret never leaves the server; no Arena credentials are sent.
 const ref=String(req.headers.referer||'')
 let embedded=false
 try{
  const parsed=new URL(ref)
  embedded=parsed.origin==='https://'+String(req.headers.host||'').toLowerCase()&&
   parsed.pathname==='/demo.html'&&parsed.searchParams.get('embed')==='1'
 }catch{}
 const sameSite=embedded?'SameSite=None; Partitioned':'SameSite=Strict'
 res.setHeader('Set-Cookie','ugo_pix_demo_session='+cookie+'; Path=/api/demo-checkout; Max-Age=3600; Secure; HttpOnly; '+sameSite)
 return cookie
}
function originOk(req){
 const origin=req.headers.origin
 const host=String(req.headers.host||'').toLowerCase()
 return origin==='https://'+host&&
  (!req.headers['sec-fetch-site']||req.headers['sec-fetch-site']==='same-origin')&&
  req.headers['x-ugo-demo-action']==='1'&&
  String(req.headers['content-type']||'').startsWith('application/json')
}
async function processor(path,method='GET',body){
 const response=await fetch(BASE+path,{
  method,headers:{access_token:process.env.ASAAS_SANDBOX_API_KEY,
   accept:'application/json','content-type':'application/json',
   'User-Agent':'UGO-Pix-ClickDemo-Sandbox/1.0'},
  ...(body?{body:JSON.stringify(body)}:{}),
  signal:AbortSignal.timeout(12000),redirect:'error'
 })
 if(!response.ok)throw Error(method==='POST'?'sandbox_processor_result_requires_review':'sandbox_processor_unavailable')
 const data=await response.json()
 if(!data||typeof data!=='object')throw Error('invalid_sandbox_processor_response')
 return data
}
async function connect(write){
 const db=new Client({connectionString:write?process.env.UGO_NEON_TEST_WRITE_URL:process.env.UGO_NEON_TEST_READONLY_URL,
 connectionTimeoutMillis:5000,query_timeout:6000,statement_timeout:6000})
 await db.connect()
 const result=await db.query('select current_database() as db,current_user as role')
 if(result.rows[0]?.db!=='neondb'||result.rows[0]?.role!==(write?'ugo_payments_sandbox_rw':'ugo_asaas_wallet_audit_ro')){
  await db.end()
  throw Error('sandbox_database_isolation_failed')
 }
 return db
}
async function intent(db,fixture){
 const r=await db.query(
  "select status,asaas_payment_id,asaas_customer_id,external_reference,gross_cents,net_cents from ugo_payments_v2.payment_intents where ugo_service_id=$1 and environment='sandbox'",
  [fixture.id])
 if(r.rows.length>1)throw Error('duplicate_intent_in_test')
 return r.rows[0]||null
}
async function readStatus(db,fixture){
 const row=await intent(db,fixture)
 if(!row)return {stage:'not_issued',amountBRL:AMOUNT}
 const allowed=fixture.id.replace(/-/g,'')
 if(row.external_reference!=='ugo_pix_test_'+allowed||Number(row.gross_cents)!==10000)
  throw Error('sandbox_charge_identity_mismatch')
 if(!row.asaas_payment_id)return {stage:'requires_review',amountBRL:AMOUNT}
 const payment=await processor('/payments/'+encodeURIComponent(row.asaas_payment_id))
 const spec=sandboxChargeSpec(fixture,row.asaas_customer_id)
 if(!issuedChargeIdentityValid({...payment,status:'PENDING'},spec)||payment.id!==row.asaas_payment_id)
  throw Error('sandbox_charge_identity_mismatch')
 if(row.status==='received'&&payment.status==='RECEIVED')
  return {stage:'received',amountBRL:AMOUNT,simulated:true}
 if(row.status==='confirmed'&&['CONFIRMED','RECEIVED'].includes(payment.status))
  return {stage:'confirmed',amountBRL:AMOUNT,simulated:true}
 if(row.status!=='pending'||payment.status!=='PENDING')
  return {stage:'requires_review',amountBRL:AMOUNT}
 const qr=await processor('/payments/'+encodeURIComponent(payment.id)+'/pixQrCode')
 if(!pendingQrValid(qr))return {stage:'expired',amountBRL:AMOUNT}
 return {stage:'awaiting_payment',amountBRL:AMOUNT,
  qrImageBase64:qr.encodedImage,qrCopyPaste:qr.payload,
  expiresAt:qr.expirationDate||null}
}
async function createPayment(db,fixture){
 const old=await intent(db,fixture)
 if(old)return readStatus(db,fixture) // Never issue two charges to one fixture.
 const quota=await db.query("select count(*)::int as n from ugo_payments_v2.payment_intents where environment='sandbox' and created_at > now() - interval '1 day' and external_reference like 'ugo_pix_test_%'")
 if(Number(quota.rows[0]?.n)>30)throw Error('sandbox_daily_limit')
 const issued=await issueProviderPix({
  db,service:fixture,providerId:PROVIDER,
  issuerWalletId:process.env.UGO_ASAAS_ISSUER_WALLET_ID,
  asaasGet:path=>processor(path),
  asaasCreate:body=>processor('/payments','POST',body)
 })
 if(issued.created!==true)throw Error('sandbox_creation_requires_review')
 return readStatus(db,fixture)
}
async function simulate(db,fixture){
 await db.query('BEGIN')
 let row
 try{
  const r=await db.query(
   "select id,status,asaas_payment_id,asaas_customer_id,external_reference,gross_cents from ugo_payments_v2.payment_intents where ugo_service_id=$1 and environment='sandbox' for update",
   [fixture.id])
  row=r.rows[0]
  if(r.rows.length!==1||row.status!=='pending'||!row.asaas_payment_id)
   throw Error('sandbox_payment_not_pending')
  const p=await processor('/payments/'+encodeURIComponent(row.asaas_payment_id))
  if(p.status!=='PENDING'||!issuedChargeIdentityValid(p,sandboxChargeSpec(fixture,row.asaas_customer_id)))
   throw Error('sandbox_payment_identity_mismatch')
  const updated=await db.query(
   "update ugo_payments_v2.payment_intents set status='unknown_processor_result',updated_at=now() where id=$1 and status='pending' returning id",
   [row.id])
  if(updated.rows.length!==1)throw Error('sandbox_confirmation_lock_failed')
  await db.query('COMMIT')
 }catch(err){await db.query('ROLLBACK').catch(()=>{});throw err}
 // Never retry if the Asaas response is ambiguous.
 await processor('/sandbox/payment/'+encodeURIComponent(row.asaas_payment_id)+'/confirm','POST')
 const verified=await processor('/payments/'+encodeURIComponent(row.asaas_payment_id))
 if(!['CONFIRMED','RECEIVED'].includes(verified.status)||!
  issuedChargeIdentityValid({...verified,status:'PENDING'},sandboxChargeSpec(fixture,row.asaas_customer_id)))
  throw Error('sandbox_confirmation_requires_review')
 const received=verified.status==='RECEIVED'
 const net=received?Math.round(Number(verified.netValue)*100):null
 if(received&&(!Number.isSafeInteger(net)||net<1||net>10000))
  throw Error('sandbox_amount_requires_review')
 await db.query(
  "update ugo_payments_v2.payment_intents set status=$2,net_cents=$3,last_reconciled_at=now(),updated_at=now() where id=$1 and status='unknown_processor_result'",
  [row.id,received?'received':'confirmed',net])
 return {stage:received?'received':'confirmed',amountBRL:AMOUNT,simulated:true}
}
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'method_not_allowed'})
 if(!enabled(req))return json(res,503,{error:'sandbox_demo_disabled'})
 if(!process.env.UGO_NEON_TEST_READONLY_URL||!process.env.UGO_NEON_TEST_WRITE_URL||
    !process.env.UGO_ASAAS_ISSUER_WALLET_ID)
  return json(res,503,{error:'sandbox_not_configured'})
 let session=authenticate(req,res)
 if(req.method==='GET'&&!session)session=issueSession(req,res)
 if(req.method==='POST'&&(!session||!originOk(req)))
  return json(res,403,{error:'sandbox_session_required'})
 const fixture=sessionFixture(session)
 const action=req.method==='POST'?req.body?.action:'status'
 if(!['status','create','simulate'].includes(action))return json(res,400,{error:'invalid_action'})
 let db
 try{
  db=await connect(action!=='status')
  const result=action==='create'?await createPayment(db,fixture):
    action==='simulate'?await simulate(db,fixture):await readStatus(db,fixture)
  return json(res,200,{environment:'sandbox',...result,realMoney:false,
   splitSettled:false,providerPaid:false})
 }catch(e){
  const raw=String(e?.message||'')
  const safe=new Set(['sandbox_payment_not_pending','sandbox_payment_identity_mismatch',
   'sandbox_confirmation_requires_review','sandbox_confirmation_lock_failed',
   'sandbox_amount_requires_review','sandbox_charge_identity_mismatch',
   'sandbox_database_isolation_failed','sandbox_creation_requires_review',
   'sandbox_processor_unavailable','sandbox_processor_result_requires_review','sandbox_daily_limit',
   'issuer_wallet_missing','issuer_wallet_not_verified','sandbox_payer_not_unique',
   'sandbox_payer_not_ready','existing_intent_requires_reconciliation',
   'remote_reference_requires_review','processor_rejected','processor_result_uncertain'])
  return json(res,409,{environment:'sandbox',error:safe.has(raw)?raw:'sandbox_test_requires_review',realMoney:false})
 }finally{if(db)await db.end().catch(()=>{})}
}
