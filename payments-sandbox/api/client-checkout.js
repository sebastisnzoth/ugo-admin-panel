/**
 * Read-only Client visibility into an already linked Pix in isolated TEST.
 * Never returns QR/payment identifiers, creates a charge, settles a split,
 * approves a service, credits a provider or modifies Arena TEST/PROD.
 */
import pg from 'pg'
import {UUID,TEST_SUPABASE_URL,isApprovedOrigin,authorizedProviderService,
 verifiedIntentForService,verifiedProcessorPayment} from '../lib/providerPixProof.js'
const{Client}=pg
const respond=(res,status,body)=>{
 res.statusCode=status
 res.setHeader('Content-Type','application/json')
 res.setHeader('Cache-Control','no-store')
 res.end(JSON.stringify(body))
}
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='OPTIONS')
  return respond(res,405,{error:'method_not_allowed'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
  return respond(res,503,{error:'test_only'})
 const origin=req.headers.origin
 if(!isApprovedOrigin(origin,process.env.UGO_PIX_ALLOWED_CLIENT_ORIGINS))
  return respond(res,403,{error:'origin_not_allowed'})
 if(typeof origin==='string'&&origin){
  res.setHeader('Vary','Origin')
  res.setHeader('Access-Control-Allow-Origin',origin)
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Authorization')
 }
 if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
 if(process.env.UGO_PROVIDER_PIX_READ_ONLY_ENABLED!=='1'||
    !process.env.UGO_NEON_TEST_READONLY_URL||
    !process.env.UGO_TEST_SUPABASE_PUBLISHABLE_KEY||
    !process.env.ASAAS_SANDBOX_API_KEY||
    !process.env.UGO_PIX_APPROVED_PILOT_SERVICE_IDS)
  return respond(res,503,{error:'client_checkout_not_configured'})
 const serviceId=req.query?.serviceId
 if(typeof serviceId!=='string'||!UUID.test(serviceId))
  return respond(res,400,{error:'invalid_service_id'})
 const header=req.headers.authorization
 const token=typeof header==='string'&&
  /^Bearer [A-Za-z0-9._-]{40,8192}$/.test(header)?header.slice(7):null
 if(!token)return respond(res,401,{error:'client_session_required'})
 let db
 try{
  const key=process.env.UGO_TEST_SUPABASE_PUBLISHABLE_KEY
  const supabaseGet=async path=>{
   const response=await fetch(TEST_SUPABASE_URL+path,{method:'GET',
    headers:{apikey:key,Authorization:'Bearer '+token,accept:'application/json'},
    signal:AbortSignal.timeout(8000),redirect:'error'})
   if(!response.ok)throw Error(response.status===401?'not_authenticated':'test_supabase_unavailable')
   return response.json()
  }
  const user=await supabaseGet('/auth/v1/user')
  if(!UUID.test(user?.id||''))throw Error('not_authenticated')
  const rows=await supabaseGet(
   '/rest/v1/servicios?select=id,cliente_id,proveedor_id,estado,tarifa,moneda,ambiente,metadata&id=eq.'+serviceId+'&limit=1')
  const service=Array.isArray(rows)&&rows.length===1?rows[0]:null
  if(!service||service.cliente_id!==user.id||
     !authorizedProviderService(service,service.proveedor_id,serviceId,
      process.env.UGO_PIX_APPROVED_PILOT_SERVICE_IDS))
   return respond(res,403,{error:'service_not_authorized_for_pix_pilot'})
  db=new Client({connectionString:process.env.UGO_NEON_TEST_READONLY_URL,
   connectionTimeoutMillis:5000,query_timeout:5000,statement_timeout:5000})
  await db.connect()
  const role=await db.query('select current_database() as db,current_user as role')
  if(role.rows[0]?.db!=='neondb'||role.rows[0]?.role!=='ugo_asaas_wallet_audit_ro')
   throw Error('test_readonly_role_required')
  const result=await db.query(
   'select ugo_service_id,ugo_client_id,ugo_provider_id,environment,'+
   'gross_cents,net_cents,provider_share_bps,status,asaas_payment_id,'+
   "asaas_customer_id,external_reference from ugo_payments_v2.payment_intents "+
   "where ugo_service_id=$1 and environment='sandbox'",[serviceId])
  const intent=result.rows.length===1?result.rows[0]:null
  if(!intent)return respond(res,200,{environment:'sandbox',stage:'not_issued',
   paymentVerified:false,providerPaid:false,splitSettled:false})
  if(!verifiedIntentForService(intent,service,service.proveedor_id)||
     intent.ugo_client_id!==user.id)throw Error('intent_ownership_mismatch')
  if(!intent.asaas_payment_id)
   return respond(res,200,{environment:'sandbox',stage:'requires_review',
    paymentVerified:false,providerPaid:false,splitSettled:false})
  const remote=await fetch('https://api-sandbox.asaas.com/v3/payments/'+
   encodeURIComponent(intent.asaas_payment_id),{
    method:'GET',headers:{access_token:process.env.ASAAS_SANDBOX_API_KEY,
     accept:'application/json','User-Agent':'UGO-Client-Pix-ReadOnly/0.1'},
    signal:AbortSignal.timeout(10000),redirect:'error'})
  if(!remote.ok)throw Error('asaas_unavailable')
  const processor=await remote.json()
  if(!verifiedProcessorPayment(processor,intent))
   throw Error('processor_identity_mismatch')
  const received=intent.status==='received'&&processor.status==='RECEIVED'&&
   Number.isSafeInteger(Number(intent.net_cents))&&
   Number(intent.net_cents)>0&&Number(intent.net_cents)<=Number(intent.gross_cents)&&
   Math.round(Number(processor.netValue)*100)===Number(intent.net_cents)
  return respond(res,200,{environment:'sandbox',
   stage:received?'received':
    intent.status==='pending'&&processor.status==='PENDING'?'awaiting_payment':
    ['RECEIVED','CONFIRMED'].includes(processor.status)?'confirming':'requires_review',
   paymentVerified:received,providerPaid:false,splitSettled:false})
 }catch(error){
  const label=String(error?.message||'')
  return respond(res,label==='not_authenticated'?401:503,{
   error:label==='not_authenticated'?'not_authenticated':'client_checkout_unavailable'})
 }finally{if(db)await db.end().catch(()=>{})}
}
