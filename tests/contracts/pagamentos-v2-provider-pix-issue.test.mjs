import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import{sandboxChargeSpec,remoteReferenceAbsent,issuedChargeIdentityValid,finalEvidenceValid}from'../../payments-sandbox/lib/providerPixIssue.js'
import{issueProviderPix}from'../../payments-sandbox/lib/issueProviderPix.js'
const service={id:'11111111-1111-4111-8111-111111111111',
 cliente_id:'22222222-2222-4222-8222-222222222222',
 proveedor_id:'33333333-3333-4333-8333-333333333333',
 estado:'esperando_aprobacion',tarifa:100,moneda:'BRL',ambiente:'demo'}
const providerId=service.proveedor_id
const payer={id:'cus_SandboxFixture',cpfCnpj:'12345678909',notificationDisabled:true}
const wallet='44444444-4444-4444-8444-444444444444'
const spec=sandboxChargeSpec(service,payer.id)
test('Sandbox charge specification uses only validated owner service, not UI price',()=>{
 assert.deepEqual(spec.paymentBody.customer,payer.id)
 assert.equal(spec.paymentBody.value,100)
 assert.equal(spec.paymentBody.billingType,'PIX')
 assert.equal(spec.externalReference,'ugo_pix_test_'+service.id.replaceAll('-',''))
 assert.throws(()=>sandboxChargeSpec({...service,tarifa:0},payer.id))
 assert.throws(()=>sandboxChargeSpec({...service,tarifa:100.001},payer.id))
 assert.throws(()=>sandboxChargeSpec({...service,tarifa:3000},payer.id))
 assert.throws(()=>sandboxChargeSpec(service,'not-customer'))
 assert.equal(remoteReferenceAbsent({data:[],hasMore:false},spec.externalReference),true)
 assert.equal(remoteReferenceAbsent({data:[],hasMore:true},spec.externalReference),false)
 assert.equal(remoteReferenceAbsent({data:[{id:'pay_existing'}],hasMore:false},spec.externalReference),false)
})
test('receipt QR material only allowed with persisted original service provider evidence',()=>{
 assert.equal(finalEvidenceValid([{id:'fixture',storage_path:'provider/after.png'}]),true)
 for(const invalid of [[],[{id:'fixture'}],[{storage_path:' '},{}],null])
  assert.equal(finalEvidenceValid(invalid),false)
})
function fakeDb(){
 let row=null,legacy=null,txn=0
 return {
  get intent(){return row},
  get transactionDepth(){return txn},
  async query(sql,args=[]){
   if(sql==='BEGIN'){txn++;return{rows:[]}}
   if(sql==='COMMIT'||sql==='ROLLBACK'){txn--;return{rows:[]}}
   if(sql.startsWith('insert into ugo_payments_v2.test_services'))return{rows:[]}
   if(sql.includes('from ugo_payments_v2.test_services where id=$1 for update'))
    return{rows:[{id:service.id,cliente_id:service.cliente_id,
     proveedor_id:providerId,estado:service.estado,tarifa_cents:10000,moneda:'BRL'}]}
   if(sql.includes('from ugo_payments_v2.payment_intents')&&sql.includes('for update'))
    return{rows:row?[row]:[]}
   if(sql.startsWith('insert into ugo_payments_v2.payment_intents')){
    row={id:'55555555-5555-4555-8555-555555555555',
     ugo_client_id:service.cliente_id,ugo_provider_id:providerId,
     gross_cents:10000,asaas_payment_id:null,
     status:'creating',external_reference:spec.externalReference}
    return{rows:[{id:row.id}]}
   }
   if(sql.startsWith('update ugo_payments_v2.payment_intents')){
    if(sql.includes("asaas_payment_id=$2,status='pending'")){
     if(row.status!=='creating')return{rows:[]}
     row.asaas_payment_id=args[1];row.status='pending';return{rows:[{id:row.id}]}
    }
    row.status=args[1];return{rows:[]}
   }
   throw Error('UNEXPECTED_TEST_DB_QUERY '+sql)
  }
 }
}
function services(db,create){
 let postCalls=0
 return {
  get postCalls(){return postCalls},
  async asaasGet(path){
   if(path==='/wallets/')return{data:[{id:wallet}]}
   if(path.startsWith('/customers?'))return{data:[payer],hasMore:false}
   if(path.startsWith('/payments?'))return{data:[],hasMore:false}
   throw Error('UNEXPECTED_TEST_PROCESSOR_GET')
  },
  async asaasCreate(payload){
   postCalls++
   if(create)throw Error(create)
   assert.deepEqual(payload,spec.paymentBody)
   return{id:'pay_sandbox_123',customer:payer.id,
    externalReference:spec.externalReference,billingType:'PIX',status:'PENDING',value:100}
  }
 }
}
test('new provider charge persists once; retry reuses original PENDING without POST',async()=>{
 const db=fakeDb(),api=services(db)
 const args={db,service,providerId,asaasGet:api.asaasGet,
  asaasCreate:api.asaasCreate,issuerWalletId:wallet}
 assert.deepEqual(await issueProviderPix(args),{created:true})
 assert.equal(db.intent.status,'pending')
 assert.equal(db.intent.asaas_payment_id,'pay_sandbox_123')
 assert.deepEqual(await issueProviderPix(args),{created:false})
 assert.equal(api.postCalls,1)
 assert.equal(db.transactionDepth,0)
})
test('uncertain processor outcome never POSTs on retry',async()=>{
 const db=fakeDb(),api=services(db,'network_uncertain')
 const args={db,service,providerId,asaasGet:api.asaasGet,
  asaasCreate:api.asaasCreate,issuerWalletId:wallet}
 await assert.rejects(issueProviderPix(args),/network_uncertain/)
 assert.equal(db.intent.status,'unknown_processor_result')
 await assert.rejects(issueProviderPix(args),/existing_intent_requires_reconciliation/)
 assert.equal(api.postCalls,1)
 assert.equal(db.transactionDepth,0)
})
test('explicit processor 4xx fails closed in manual_review, not a second charge',async()=>{
 const db=fakeDb(),api=services(db,'processor_rejected')
 const args={db,service,providerId,asaasGet:api.asaasGet,
  asaasCreate:api.asaasCreate,issuerWalletId:wallet}
 await assert.rejects(issueProviderPix(args),/processor_rejected/)
 assert.equal(db.intent.status,'manual_review')
 await assert.rejects(issueProviderPix(args),/existing_intent_requires_reconciliation/)
 assert.equal(api.postCalls,1)
})
test('unverified wallet or payer prevents TEST charge reservation',async()=>{
 const db=fakeDb(),api=services(db)
 await assert.rejects(issueProviderPix({db,service,providerId,
  asaasGet:api.asaasGet,asaasCreate:api.asaasCreate,
  issuerWalletId:'not-a-uuid'}),/issuer_wallet_missing/)
 assert.equal(db.intent,null)
 assert.equal(api.postCalls,0)
})
test('fresh Asaas response identities must match the reserved exact charge',()=>{
 const charge={id:'pay_sandbox_123',customer:payer.id,
  externalReference:spec.externalReference,billingType:'PIX',value:100,status:'PENDING'}
 assert.equal(issuedChargeIdentityValid(charge,spec),true)
 assert.equal(issuedChargeIdentityValid({...charge,value:99},spec),false)
 assert.equal(issuedChargeIdentityValid({...charge,status:'RECEIVED'},spec),false)
 assert.equal(issuedChargeIdentityValid({...charge,externalReference:'other'},spec),false)
})

test('provider charge creation requires independent Preview-only flags, JWT and final photo',()=>{
 const file=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
 const endpoint=file('payments-sandbox/api/provider-checkout.js')
 const flags=file('src/lib/featureFlags.ts')
 const ui=file('src/mvp/ProviderDeferredPixStatus.tsx')
 assert.ok(endpoint.includes("process.env.VERCEL_ENV!=='preview'"))
 assert.ok(endpoint.includes("process.env.UGO_PROVIDER_PIX_CREATE_ENABLED!=='1'"))
 assert.ok(endpoint.includes("!process.env.UGO_NEON_TEST_WRITE_URL"))
 assert.ok(endpoint.includes('issueProviderPix({db,service,providerId:user.id'))
 assert.ok(endpoint.includes('finalEvidenceValid(evidence)'))
 assert.ok(endpoint.includes("const user=await supabaseGet('/auth/v1/user',token,key)"))
 assert.ok(endpoint.includes('authorizedProviderService(service,user.id,serviceId'))
 assert.ok(endpoint.includes("Access-Control-Allow-Methods','GET, POST, OPTIONS"))
 assert.ok(flags.includes("env.VITE_VERCEL_ENV==='preview'"))
 assert.ok(flags.includes('VITE_FLAG_PIX_PROVIDER_ISSUE_PREVIEW'))
 assert.ok(ui.includes("method:'POST'"))
 assert.ok(ui.includes("body:JSON.stringify({action:'create',serviceId})"))
 assert.ok(ui.includes("Authorization:'Bearer '+accessToken"))
 assert.doesNotMatch(ui,/UGO_TEST_OPERATOR_TOKEN|ASAAS_SANDBOX_API_KEY/)
})

test('provider only presents Sandbox Pix after client approval and explicit collection choice',()=>{
 const source=readFileSync(new URL('../../src/mvp/ProviderDeferredPixStatus.tsx',import.meta.url),'utf8')
 assert.match(source,/const readyForPix=finished&&workApproved/)
 const collection=readFileSync(new URL('../../src/mvp/ProviderPostServiceCollection.tsx',import.meta.url),'utf8')
 assert.match(collection,/previewPix\?<ProviderDeferredPixStatus/)
 assert.doesNotMatch(collection,/PIX_SANDBOX_DEMO_URL|demo\.html/)
 assert.match(source,/collectionMethod==='pix'&&payment.stage==='not_issued'/)
 assert.match(source,/t\('providerPix.charge'\)/)
 assert.match(source,/t\('providerPix.cash'\)/)
 assert.match(readFileSync(new URL('../../src/i18n/translations/extended.ts',import.meta.url),'utf8'),/Esta selección no registra el pago ni genera Pix/)
 assert.match(source,/payment.stage==='awaiting_payment'/)
 assert.match(source,/payload.stage==='received'/)
})
