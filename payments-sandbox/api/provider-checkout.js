/**
 * TEST-only, provider-JWT-authenticated read of an already linked Asaas Pix.
 * Does NOT create charges, trust browser-supplied payment IDs, mark services
 * paid, move funds, or use a privileged Supabase credential.
 */
import pg from 'pg'
import {
 UUID,TEST_SUPABASE_URL,isApprovedOrigin,authorizedProviderService,
 verifiedIntentForService,verifiedProcessorPayment,pendingQrValid
} from '../lib/providerPixProof.js'
const {Client}=pg
const out=(res,code,body)=>{
 res.statusCode=code
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Content-Type','application/json')
 res.end(JSON.stringify(body))
}
function cors(req,res){
 const origin=req.headers.origin
 if(!isApprovedOrigin(origin,process.env.UGO_PIX_ALLOWED_CLIENT_ORIGINS))return false
 if(typeof origin==='string'&&origin){
  res.setHeader('Vary','Origin')
  res.setHeader('Access-Control-Allow-Origin',origin)
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Authorization')
  res.setHeader('Access-Control-Max-Age','300')
 }
 return true
}
async function supabaseGet(path,jwt,key){
 const response=await fetch(TEST_SUPABASE_URL+path,{
  method:'GET',headers:{apikey:key,Authorization:'Bearer '+jwt,Accept:'application/json'},
  signal:AbortSignal.timeout(8000),redirect:'error'
 })
 if(!response.ok)throw Error(response.status===401?'not_authenticated':'test_supabase_unavailable')
 const data=await response.json()
 return data
}
async function asaasGet(path){
 const r=await fetch('https://api-sandbox.asaas.com/v3'+path,{
  method:'GET',headers:{access_token:process.env.ASAAS_SANDBOX_API_KEY,
   accept:'application/json','User-Agent':'UGO-Provider-Pix-ReadOnly/0.1'},
  signal:AbortSignal.timeout(10000),redirect:'error'
 })
 if(!r.ok)throw Error('asaas_verification_unavailable')
 return r.json()
}
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='OPTIONS')
  return out(res,405,{error:'method_not_allowed'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
  return out(res,503,{error:'test_only'})
 if(!cors(req,res))return out(res,403,{error:'origin_not_allowed'})
 if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('Cache-Control','no-store');return res.end()}
 if(process.env.UGO_PROVIDER_PIX_READ_ONLY_ENABLED!=='1'||
    !process.env.UGO_NEON_TEST_READONLY_URL||
    !process.env.UGO_TEST_SUPABASE_PUBLISHABLE_KEY||
    !process.env.ASAAS_SANDBOX_API_KEY||
    !process.env.UGO_PIX_APPROVED_PILOT_SERVICE_IDS)
  return out(res,503,{error:'provider_checkout_not_configured'})
 const serviceId=req.query?.serviceId
 if(typeof serviceId!=='string'||!UUID.test(serviceId))
  return out(res,400,{error:'invalid_service_id'})
 const header=req.headers.authorization
 const token=typeof header==='string'&&/^Bearer [A-Za-z0-9._-]{40,8192}$/.test(header)?
  header.slice(7):null
 if(!token)return out(res,401,{error:'provider_session_required'})
 let db
 try{
  const key=process.env.UGO_TEST_SUPABASE_PUBLISHABLE_KEY
  const user=await supabaseGet('/auth/v1/user',token,key)
  if(!UUID.test(user?.id||''))throw Error('not_authenticated')
  const query='/rest/v1/servicios?select=id,cliente_id,proveedor_id,estado,tarifa,moneda,ambiente,metadata&id=eq.'+serviceId+'&limit=1'
  const rows=await supabaseGet(query,token,key)
  const service=Array.isArray(rows)&&rows.length===1?rows[0]:null
  if(!authorizedProviderService(service,user.id,serviceId,
     process.env.UGO_PIX_APPROVED_PILOT_SERVICE_IDS))
   return out(res,403,{error:'service_not_authorized_for_pix_pilot'})
  // Final uploaded evidence must be visible under the provider's own RLS.
  const evidence=await supabaseGet('/rest/v1/evidencias_servicio?select=id&servicio_id=eq.'+
   serviceId+'&usuario_id=eq.'+user.id+'&tipo=eq.despues&limit=1',token,key)
  if(!Array.isArray(evidence)||evidence.length!==1)
   return out(res,409,{error:'final_evidence_not_verified'})
  db=new Client({connectionString:process.env.UGO_NEON_TEST_READONLY_URL,
   connectionTimeoutMillis:5000,query_timeout:5000,statement_timeout:5000})
  await db.connect()
  const role=await db.query('select current_database() as db,current_user as role')
  if(role.rows[0]?.db!=='neondb'||role.rows[0]?.role!=='ugo_asaas_wallet_audit_ro')
   throw Error('test_readonly_role_required')
  const result=await db.query(
   'select ugo_service_id,ugo_client_id,ugo_provider_id,environment,'+
   'gross_cents,net_cents,provider_share_bps,status,asaas_payment_id,asaas_customer_id,external_reference '+
   "from ugo_payments_v2.payment_intents where ugo_service_id=$1 and environment='sandbox'",
   [serviceId])
  const intent=result.rows.length===1?result.rows[0]:null
  if(!intent)return out(res,409,{error:'payment_not_linked'})
  if(!verifiedIntentForService(intent,service,user.id))
   throw Error('payment_ownership_mismatch')
  if(!intent.asaas_payment_id)
   return out(res,409,{error:'payment_creation_unresolved'})
  const payment=await asaasGet('/payments/'+encodeURIComponent(intent.asaas_payment_id))
  if(!verifiedProcessorPayment(payment,intent))
   throw Error('payment_identity_mismatch')
  const amountBRL=Number(intent.gross_cents)/100
  if(intent.status==='received'){
   const net=Math.round(Number(payment.netValue)*100)
   if(payment.status!=='RECEIVED'||!Number.isSafeInteger(net)||
      net!==Number(intent.net_cents))
    throw Error('receipt_not_verified')
   return out(res,200,{environment:'sandbox',stage:'received',amountBRL,
    paymentVerified:true,splitSettled:false,providerPaid:false,financialWritesPerformed:false})
  }
  if(intent.status==='pending'&&payment.status==='PENDING'){
   const qr=await asaasGet('/payments/'+encodeURIComponent(payment.id)+'/pixQrCode')
   if(!pendingQrValid(qr))return out(res,409,{error:'qr_unavailable_or_expired'})
   return out(res,200,{environment:'sandbox',stage:'awaiting_payment',
    amountBRL,qrImageBase64:qr.encodedImage,qrCopyPaste:qr.payload,
    expiresAt:qr.expirationDate||null,paymentVerified:false,
    splitSettled:false,providerPaid:false,financialWritesPerformed:false})
  }
  if(['CONFIRMED','RECEIVED'].includes(payment.status))
   return out(res,200,{environment:'sandbox',stage:'confirming',amountBRL,
    paymentVerified:false,splitSettled:false,providerPaid:false,financialWritesPerformed:false})
  return out(res,409,{error:'payment_not_payable'})
 }catch(error){
  const label=String(error?.message||'')
  const status=label==='not_authenticated'?401:
   label==='payment_ownership_mismatch'?403:
   label==='payment_identity_mismatch'||label==='receipt_not_verified'?409:503
  const allowed=new Set(['not_authenticated','payment_ownership_mismatch',
   'payment_identity_mismatch','receipt_not_verified',
   'test_readonly_role_required','test_supabase_unavailable',
   'asaas_verification_unavailable'])
  return out(res,status,{error:allowed.has(label)?label:'provider_checkout_unavailable'})
 }finally{
  if(db)await db.end().catch(()=>{})
 }
}
