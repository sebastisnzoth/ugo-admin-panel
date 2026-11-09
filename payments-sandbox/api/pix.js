import { timingSafeEqual, randomInt } from 'node:crypto'
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
 if(!r.ok){
  const detail=await r.json().catch(()=>null)
  const safeCodes=Array.isArray(detail?.errors)?
   detail.errors.map(x=>x?.code).filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(x)).slice(0,3):[]
  // Classify only predefined field names. Never return free-form processor descriptions,
  // which can contain payer data, account identifiers or other sensitive values.
  const safeFields=Array.isArray(detail?.errors)?[...new Set(detail.errors.flatMap(x=>{
   const description=typeof x?.description==='string'?x.description.toLowerCase():''
   const found=[]
   if(/cpf\s*\/?\s*cnpj|cpfcnpj/.test(description))found.push('cpfCnpj')
   if(/\bcliente\b|\bcustomer\b/.test(description))found.push('customer')
   if(/\bvencimento\b|\bdue\s*date\b|\bduedate\b/.test(description))found.push('dueDate')
   if(/\bvalor\b|\bamount\b/.test(description))found.push('value')
   if(/\bforma de pagamento\b|\bbillingtype\b/.test(description))found.push('billingType')
   if(/\breferência externa\b|\bexternalreference\b/.test(description))found.push('externalReference')
   return found
  }))].slice(0,6):[]
  const error=new Error('asaas_http_'+r.status)
  error.safeCodes=safeCodes
  error.safeFields=safeFields
  throw error
 }
 const data=await r.json()
 if(!data||typeof data!=='object')throw Error('invalid_asaas_response')
 return data
}
async function verifiedCustomer(){
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
 return customers.data[0]
}
async function preflight(){
 const customer=await verifiedCustomer()
 // Never send a Pix charge for an incomplete payer.
 if(typeof customer.cpfCnpj!=='string'||!/^(?:\d{11}|\d{14})$/.test(customer.cpfCnpj))
  throw Error('payer_document_missing')
 return customer.id
}
/**
 * Asaas permits fictitious test data in Sandbox; a generated CPF is NOT
 * an identity document and MUST NEVER be used outside the TEST account.
 * Operator-controlled action, not part of automated charge creation.
 */
function syntheticSandboxCpf(){
 const digits=Array.from(String(randomInt(100000000,1000000000)),Number)
 const digit=(values,weight)=>{
  const remainder=values.reduce((sum,value,index)=>sum+value*(weight-index),0)%11
  return remainder<2?0:11-remainder
 }
 digits.push(digit(digits,10))
 digits.push(digit(digits,11))
 return digits.join('')
}
async function prepareCustomer(){
 const customer=await verifiedCustomer()
 if(typeof customer.cpfCnpj==='string'&&/^(?:\d{11}|\d{14})$/.test(customer.cpfCnpj))
  return {action:'prepare_customer',alreadyPrepared:true,
   payerDocumentPresent:true,financialWritesPerformed:false}
 // The sole known Sandbox payer is updated, never duplicated. Never send
 // invented identity data to a production API or real-world KYC.
 const cpf=syntheticSandboxCpf()
 const updated=await processor('/customers/'+encodeURIComponent(customer.id),'PUT',{
  cpfCnpj:cpf,notificationDisabled:true
 })
 if(updated?.id!==customer.id||updated?.cpfCnpj!==cpf)
  throw Error('sandbox_customer_update_requires_review')
 // Discard the synthetic CPF from the outward response and all logs.
 return {action:'prepare_customer',alreadyPrepared:false,
  payerDocumentPresent:true,notificationsDisabled:updated.notificationDisabled===true,
  financialWritesPerformed:false,sandboxCustomerUpdated:true}
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
 if(row.status==='received'&&state!=='received')
  throw Error('processor_state_regression')
 if(row.status==='confirmed'&&state==='pending')
  throw Error('processor_state_regression')
 if(row.status==='manual_review')
  throw Error('manual_review_requires_operator')
 if(row.net_cents!==null&&state==='received'&&
   Number(row.net_cents)!==Math.round(Number(p.netValue)*100))
  throw Error('processor_net_amount_changed')
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
  const raw=String(e?.message||'')
  const rejected=/^asaas_http_4[0-9]{2}$/.test(raw)
  await db.query(`update ugo_payments_v2.payment_intents set
   status=$2,updated_at=now()
   where id=$1 and status='creating'`,
   [reservation.id,rejected?'manual_review':'unknown_processor_result']).catch(()=>{})
  if(rejected){const error=new Error(raw);error.safeCodes=e.safeCodes||[];error.safeFields=e.safeFields||[];throw error}
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
 if(!['CONFIRMED','RECEIVED'].includes(verified.status))
  throw Error('confirmation_not_yet_verified_reconcile_later')
 return {action:'confirmed',paymentId:verified.id,...await sync(db,row,verified)}
}
async function reconcile(db){
 const row=await existing(db)
 if(!row)throw Error('no_reserved_payment')
 const p=await getVerifiedPayment(row)
 return {action:'reconciled',paymentId:p.id,...await sync(db,row,p)}
}

/**
 * One-time operator recovery after a genuinely ambiguous creation attempt.
 * Requires a fresh authenticated Asaas query by the exact persisted reference;
 * zero matches is mandatory, never infer this from Neon alone.
 * Existing or ambiguous remote payments NEVER cause a second POST.
 */
async function recoverCreate(db){
 const row=await existing(db)
 if(!row || row.status!=='unknown_processor_result' || row.asaas_payment_id)
  throw Error('recovery_requires_uncertain_unlinked_intent')
 const expected='ugo_pix_test_'+process.env.UGO_PIX_TEST_SERVICE_ID.replace(/-/g,'')
 if(row.external_reference!==expected||Number(row.gross_cents)!==10000)
  throw Error('recovery_identity_mismatch')
 const customerId=await preflight()
 if(row.asaas_customer_id!==customerId)
  throw Error('recovery_customer_mismatch')
 const path='/payments?limit=2&offset=0&externalReference='+encodeURIComponent(expected)
 const list=await processor(path)
 if(!Array.isArray(list.data)||typeof list.hasMore!=='boolean')
  throw Error('invalid_remote_reconciliation')
 if(list.hasMore||list.data.length!==0)
  throw Error('remote_payment_requires_manual_reconciliation')
 const claim=await db.query(`update ugo_payments_v2.payment_intents
  set status='creating',updated_at=now()
  where id=$1 and status='unknown_processor_result' and asaas_payment_id is null
   and updated_at < now()-interval '2 minutes'
  returning id`,[row.id])
 if(claim.rows.length!==1)throw Error('recovery_claim_or_cooldown_failed')
 let charge
 try {
  const due=new Date(Date.now()+7*86400000).toISOString().slice(0,10)
  charge=await processor('/payments','POST',{
   customer:customerId,billingType:'PIX',value:100,dueDate:due,
   externalReference:expected
  })
  if(!ID.test(charge?.id||'')||charge.externalReference!==expected||
     charge.customer!==customerId||charge.billingType!=='PIX'||
     Math.round(Number(charge.value)*100)!==10000)
   throw Error('remote_charge_identity_uncertain')
  const updated=await db.query(`update ugo_payments_v2.payment_intents
   set status='pending',asaas_payment_id=$2,updated_at=now()
   where id=$1 and status='creating' and asaas_payment_id is null returning id`,
   [row.id,charge.id])
  if(updated.rows.length!==1)throw Error('remote_charge_persistence_uncertain')
 }catch(e){
  const raw=String(e?.message||'')
  const known4xx=/^asaas_http_4[0-9]{2}$/.test(raw)
  await db.query(`update ugo_payments_v2.payment_intents
   set status=$2,updated_at=now() where id=$1 and status='creating'`,
   [row.id,known4xx?'manual_review':'unknown_processor_result']).catch(()=>{})
  if(known4xx){const error=new Error(raw);error.safeCodes=e.safeCodes||[];error.safeFields=e.safeFields||[];throw error}
  throw Error('recovery_processor_result_uncertain')
 }
 const qr=await processor('/payments/'+encodeURIComponent(charge.id)+'/pixQrCode')
 if(typeof qr.payload!=='string'||!qr.payload||
    typeof qr.encodedImage!=='string'||!qr.encodedImage)
  throw Error('recovered_payment_qr_unavailable')
 return {action:'recovered_created',paymentId:charge.id,
  processorStatus:charge.status||'PENDING',
  qrCopyPaste:qr.payload,qrImageBase64:qr.encodedImage,
  splitSettled:false,providerPaid:false}
}

/**
 * Diagnostic is strictly read-only. Do not expose identifiers, PII or full
 * Asaas response data. It is safe even while the intent is manual_review.
 */
async function diagnose(db){
 const row=await existing(db)
 const ref='ugo_pix_test_'+process.env.UGO_PIX_TEST_SERVICE_ID.replace(/-/g,'')
 if(row && (row.external_reference!==ref || Number(row.gross_cents)!==10000))
  throw Error('diagnostic_fixture_identity_mismatch')
 const [wallets,customers,account,keys,remote]=await Promise.all([
  processor('/wallets/'),
  processor('/customers?limit=2&offset=0'),
  processor('/myAccount/status/'),
  processor('/pix/addressKeys?limit=2&offset=0'),
  processor('/payments?limit=2&offset=0&externalReference='+encodeURIComponent(ref)),
 ])
 const issuer=process.env.UGO_ASAAS_ISSUER_WALLET_ID
 const walletVerified=UUID.test(issuer||'')&&Array.isArray(wallets.data)&&
  wallets.data.length===1&&String(wallets.data[0]?.id||'').toLowerCase()===issuer.toLowerCase()
 const uniqueCustomer=Array.isArray(customers.data)&&customers.data.length===1&&
  customers.hasMore===false&&/^cus_[a-zA-Z0-9_-]{1,96}$/.test(customers.data[0]?.id||'')
 const customer=uniqueCustomer?customers.data[0]:null
 const remoteValid=Array.isArray(remote.data)&&remote.hasMore===false
 return Object.freeze({
  action:'diagnostic',environment:'sandbox',
  walletVerified,uniqueCustomer,
  payerDocumentPresent:typeof customer?.cpfCnpj==='string'&&/^\d{11}(?:\d{3})?$/.test(customer.cpfCnpj),
  notificationsDisabled:customer?.notificationDisabled===true,
  accountApproved:account?.general==='APPROVED',
  pixKeyCount:Array.isArray(keys.data)&&keys.hasMore===false?keys.data.length:null,
  localIntentStatus:row?.status||'absent',
  localPaymentLinked:!!row?.asaas_payment_id,
  remoteLookupConclusive:remoteValid,
  remoteChargeCount:remoteValid?remote.data.filter(p=>p?.externalReference===ref).length:null,
  financialWritesPerformed:false,
 })
}
/**
 * Independent no-write processor attestation for the one canonical Sandbox Pix.
 * Identity checks bind Asaas GET to the existing service, payer, reference and
 * amount. This never uses the Asaas confirmation endpoint and never claims
 * provider payout, native Split, escrow, QR proof or full E2E PASS.
 */
async function verifyReceived(db){
 const row=await existing(db)
 if(!row||row.status!=='received'||!row.asaas_payment_id||
    !row.asaas_customer_id||row.net_cents===null)
  throw Error('received_intent_not_ready_for_verification')
 const expected='ugo_pix_test_'+process.env.UGO_PIX_TEST_SERVICE_ID.replace(/-/g,'')
 if(row.external_reference!==expected||Number(row.gross_cents)!==10000)
  throw Error('received_intent_identity_mismatch')
 const payment=await getVerifiedPayment(row)
 const processorReceived=payment.status==='RECEIVED'
 const net=Number(payment.netValue)
 const netCents=Number.isFinite(net)?Math.round(net*100):null
 const netMatches=processorReceived&&Number.isSafeInteger(netCents)&&
  netCents>0&&netCents<=10000&&netCents===Number(row.net_cents)
 return Object.freeze({action:'verify_received',environment:'sandbox',
  localStatus:'received',processorReceived,identityVerified:true,
  grossAmountVerified:true,netAmountVerified:netMatches,
  paymentVerified:processorReceived&&netMatches,
  splitSettled:false,providerPaid:false,escrowAvailable:false,
  pixQrProofPresent:false,e2ePass:false,financialWritesPerformed:false})
}
/**
 * Authenticated, read-only reconciliation inventory for previously created TEST
 * intents. Only canonical charge references are queried remotely. Legacy
 * synthetic fixtures are reported as skipped, not as unpaid charges.
 * Never returns reference IDs, payer data or processor response bodies.
 */
async function auditIntents(db){
 const result=await db.query(`select status,external_reference,asaas_payment_id
  from ugo_payments_v2.payment_intents
  where environment='sandbox' order by created_at asc limit 21`)
 if(result.rows.length>20)throw Error('too_many_test_intents_for_audit')
 const summary={checked:0,remoteAbsent:0,remotePresent:0,
  remoteAmbiguous:0,legacySyntheticSkipped:0,linkedLocally:0}
 for(const row of result.rows){
  if(row.asaas_payment_id)summary.linkedLocally++
  if(!/^ugo_pix_test_[a-f0-9]{32}$/.test(row.external_reference||'')){
   summary.legacySyntheticSkipped++
   continue
  }
  const remote=await processor('/payments?limit=2&offset=0&externalReference='+
   encodeURIComponent(row.external_reference))
  if(!Array.isArray(remote.data)||typeof remote.hasMore!=='boolean')
   throw Error('invalid_remote_reconciliation')
  summary.checked++
  const matched=remote.data.filter(p=>p?.externalReference===row.external_reference)
  if(remote.hasMore||matched.length!==remote.data.length||matched.length>1)
   summary.remoteAmbiguous++
  else if(matched.length===1)summary.remotePresent++
  else summary.remoteAbsent++
 }
 return Object.freeze({action:'audit_intents',environment:'sandbox',
  localIntentCount:result.rows.length,...summary,
  readyForAutomaticRetry:false,financialWritesPerformed:false})
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
 if(!['create','confirm','reconcile','recover_create','diagnose','audit_intents','prepare_customer','verify_received'].includes(action))
  return json(res,400,{error:'invalid_action'})
 let db
 try{
  db=await dbConnect()
  const result=action==='diagnose'?await diagnose(db):
    action==='audit_intents'?await auditIntents(db):
    action==='verify_received'?await verifyReceived(db):
    action==='prepare_customer'?await prepareCustomer():
    action==='create'?await create(db):
    action==='recover_create'?await recoverCreate(db):
    action==='confirm'?await confirm(db):await reconcile(db)
  return json(res,200,{environment:'sandbox',...result})
 }catch(e){
  // No secret, customer data, QR, or raw processor body is ever logged.
  const raw=String(e?.message||'')
  const allowed=new Set([
   'received_intent_not_ready_for_verification','received_intent_identity_mismatch',
   'sandbox_customer_update_requires_review',
   'too_many_test_intents_for_audit','payer_document_missing',
   'wallet_not_configured','issuer_wallet_not_verified',
   'diagnostic_fixture_identity_mismatch',
   'single_sandbox_customer_not_verified','not_isolated_test_role',
   'invalid_synthetic_service','existing_reservation_requires_reconciliation',
   'existing_charge_state_requires_reconciliation','existing_qr_unavailable',
   'create_uncertain_stop_and_reconcile','qr_not_ready_payment_persisted',
   'no_reserved_payment','processor_id_missing','processor_identity_mismatch',
   'not_confirmable_reconcile_required','another_confirmation_in_progress',
   'confirmation_uncertain_reconcile_without_retry',
   'confirmation_not_yet_verified_reconcile_later','processor_state_regression',
   'manual_review_requires_operator','processor_net_amount_changed',
   'net_value_invalid','invalid_reconciliation_transition',
   'recovery_requires_uncertain_unlinked_intent','recovery_identity_mismatch',
   'recovery_customer_mismatch','invalid_remote_reconciliation',
   'remote_payment_requires_manual_reconciliation',
   'recovery_claim_or_cooldown_failed','recovery_processor_result_uncertain',
   'recovered_payment_qr_unavailable','asaas_http_400','asaas_http_401',
   'asaas_http_403','asaas_http_404','asaas_http_422',
  ])
  const code=allowed.has(raw)?raw:'sandbox_operation_failed'
  const safeCodes=Array.isArray(e?.safeCodes)?
   e.safeCodes.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(x)).slice(0,3):[]
  const allowedFields=new Set(['cpfCnpj','customer','dueDate','value','billingType','externalReference'])
  const safeFields=Array.isArray(e?.safeFields)?
   e.safeFields.filter(x=>allowedFields.has(x)).slice(0,6):[]
  return json(res,409,{environment:'sandbox',error:code,
   ...(safeCodes.length?{processorValidationCodes:safeCodes}:{}),
   ...(safeFields.length?{processorValidationFields:safeFields}:{})})
 }finally{if(db)await db.end().catch(()=>{})}
}
