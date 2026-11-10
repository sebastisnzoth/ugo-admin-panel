import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import {
 isApprovedOrigin,authorizedProviderService,verifiedIntentForService,
 verifiedProcessorPayment,pendingQrValid
} from '../../payments-sandbox/lib/providerPixProof.js'

const serviceId='11111111-1111-4111-8111-111111111111'
const clientId='22222222-2222-4222-8222-222222222222'
const providerId='33333333-3333-4333-8333-333333333333'
const baseService={
 id:serviceId,cliente_id:clientId,proveedor_id:providerId,
 estado:'esperando_aprobacion',tarifa:100,ambiente:'demo',moneda:'BRL',
 metadata:{pix_after_service_authorized:true,payment_timing:'after_service',requested_payment_method:'pix'}
}
const intent={
 ugo_service_id:serviceId,ugo_client_id:clientId,ugo_provider_id:providerId,
 environment:'sandbox',gross_cents:10000,provider_share_bps:8500,
 asaas_customer_id:'cus_123456',asaas_payment_id:'pay_ABC123',
 external_reference:'ugo_pix_test_'+serviceId.replace(/-/g,'')
}
const payment={id:'pay_ABC123',customer:'cus_123456',
 externalReference:intent.external_reference,billingType:'PIX',value:100,status:'PENDING'}
const allowed=serviceId
const eligible=(service=baseService,userId=providerId,allow=allowed)=>
 authorizedProviderService(service,userId,serviceId,allow)

test('provider TEST proof fails closed on unknown or foreign services',()=>{
 assert.equal(eligible(),true)
 assert.equal(eligible(baseService,clientId),false)
 assert.equal(eligible(baseService,providerId,''),false)
 assert.equal(eligible({...baseService,proveedor_id:clientId}),false)
 assert.equal(eligible({...baseService,cliente_id:'not-uuid'}),false)
 assert.equal(eligible({...baseService,id:clientId}),false)
 assert.equal(eligible({...baseService,ambiente:'real'}),false)
 assert.equal(eligible({...baseService,moneda:'USD'}),false)
 assert.equal(eligible({...baseService,estado:'llegado'}),false)
 assert.equal(eligible({...baseService,estado:'en_progreso'}),false)
 assert.equal(eligible({...baseService,metadata:{...baseService.metadata,requested_payment_method:'efectivo'}}),false)
 assert.equal(eligible({...baseService,metadata:{...baseService.metadata,pix_after_service_authorized:false}}),false)
 assert.equal(eligible({...baseService,metadata:{...baseService.metadata,payment_timing:'before_service'}}),false)
 assert.equal(eligible({...baseService,tarifa:0}),false)
 assert.equal(eligible({...baseService,tarifa:2000.001}),false)
 assert.equal(eligible({...baseService,tarifa:0.001}),false)
 assert.equal(eligible({...baseService,tarifa:100.56}),true)
 assert.equal(eligible({...baseService,estado:'completado'}),true)
})
test('payment intent must match immutable provider, client, environment, amount and reference',()=>{
 assert.equal(verifiedIntentForService(intent,baseService,providerId),true)
 for(const [field,wrong] of [
  ['ugo_client_id',providerId],['ugo_provider_id',clientId],
  ['ugo_service_id',clientId],['environment','production'],
  ['gross_cents',9999],['provider_share_bps',9000],
  ['external_reference','arbitrary'],['asaas_customer_id','not-customer']
 ]){
  assert.equal(verifiedIntentForService({...intent,[field]:wrong},baseService,providerId),false,field)
 }
 assert.equal(verifiedIntentForService(intent,baseService,clientId),false)
})
test('Asaas confirmation is never inferred from local reference alone',()=>{
 assert.equal(verifiedProcessorPayment(payment,intent),true)
 for(const [field,wrong] of [
  ['id','pay_other'],['customer','cus_other'],
  ['externalReference','other'],['billingType','BOLETO'],['value',98.99]
 ])assert.equal(verifiedProcessorPayment({...payment,[field]:wrong},intent),false,field)
 assert.equal(verifiedProcessorPayment(payment,{...intent,asaas_payment_id:'invalid/id'}),false)
})
test('QR is drawable only with bounded authentic-looking payload and nonexpired time',()=>{
 const good={payload:'000201PIXTEST',encodedImage:'aGVsbG8=',expirationDate:new Date(Date.now()+60000).toISOString()}
 assert.equal(pendingQrValid(good),true)
 assert.equal(pendingQrValid({...good,expirationDate:new Date(Date.now()-60000).toISOString()}),false)
 assert.equal(pendingQrValid({...good,encodedImage:'javascript:alert(1)'}),false)
 assert.equal(pendingQrValid({...good,payload:''}),false)
 assert.equal(pendingQrValid({...good,payload:'x'.repeat(4100)}),false)
})
test('browser origin requires an exact allowlisted HTTPS Preview host',()=>{
 const preview='https://ugo-preview.example.vercel.app'
 assert.equal(isApprovedOrigin(preview,preview),true)
 assert.equal(isApprovedOrigin(preview,'https://other.example.vercel.app'),false)
 assert.equal(isApprovedOrigin(preview,''),false)
 assert.equal(isApprovedOrigin(preview,'*'),false)
 assert.equal(isApprovedOrigin('http://localhost:4173','http://localhost:4173'),false)
 assert.equal(isApprovedOrigin(null,''),true) // Server-side still must authenticate JWT
})

test('Client receipt proves ownership and Asaas RECEIVED without exposing Pix QR or payout',()=>{
 const api=readFileSync(new URL('../../payments-sandbox/api/client-checkout.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../../src/features/client/payments/ClientDeferredPixReceipt.tsx',import.meta.url),'utf8')
 const review=readFileSync(new URL('../../src/features/client/order/ClientCompletionReview.tsx',import.meta.url),'utf8')
 assert.ok(api.includes("process.env.VERCEL_ENV!=='preview'"))
 assert.ok(api.includes("if(req.method!=='GET'&&req.method!=='OPTIONS')"))
 assert.ok(api.includes("service.cliente_id!==user.id"))
 assert.ok(api.includes("!authorizedProviderService(service,service.proveedor_id"))
 assert.ok(api.includes("!verifiedIntentForService(intent,service,service.proveedor_id)"))
 assert.ok(api.includes("processor.status==='RECEIVED'"))
 assert.ok(api.includes("stage:received?'received'"))
 assert.doesNotMatch(api,/qrImageBase64|qrCopyPaste|pixQrCode|POST \/payments|splitSettled:true|providerPaid:true/)
 assert.ok(ui.includes("row.paymentVerified===true"))
 assert.ok(ui.includes("Authorization:'Bearer '+session.access_token"))
 assert.ok(review.includes('<ClientDeferredPixReceipt serviceId={service.id}/>'))
 assert.doesNotMatch(ui,/ASAAS_SANDBOX_API_KEY|UGO_TEST_OPERATOR_TOKEN/)
})
