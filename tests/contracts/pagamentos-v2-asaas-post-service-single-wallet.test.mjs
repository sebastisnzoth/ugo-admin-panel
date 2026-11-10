import test from 'node:test'
import assert from 'node:assert/strict'
import {issuePostServiceSingleWalletPix} from '../../src/server/payments/asaasPostServiceSingleWalletFlow.mjs'

const serviceId='eaa9597f-da69-4c34-bd9b-4cfc1ef98e9c'
const providerId='11111111-1111-4111-8111-111111111111'
const clientId='22222222-2222-4222-8222-222222222222'
const reference='ugo_test_'+serviceId.replaceAll('-','')
const customerId='cus_test_123'
const paymentId='pay_test_123'
const goodContext=()=>({
 environment:'sandbox',issuerWalletVerified:true,
 issuerWalletId:'33333333-3333-4333-8333-333333333333',
 customerId,customerClientId:clientId,externalReference:reference,
 service:{id:serviceId,cliente_id:clientId,proveedor_id:providerId,
  ambiente:'demo',moneda:'BRL',estado:'esperando_aprobacion',
  evidenceVerified:true,pixAfterServiceAuthorized:true,
  paymentMethod:'pix',paymentTiming:'after_service',tarifa:100}
})
const charge={id:paymentId,customer:customerId,externalReference:reference,
 billingType:'PIX',value:100,status:'PENDING'}
const qr={payload:'00020126280014br.gov.bcb.pix',encodedImage:'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo='}
function build({context=goodContext(),mode='reserved',failure=false,brokenQr=false}={}){
 const calls={created:0,reserved:0,saved:0,uncertain:0,read:0}
 let savedPayment=mode==='existing'?paymentId:null
 const repo={
  loadContext:async()=>context,
  reserve:async()=>{calls.reserved++;return mode==='existing'||
    savedPayment?{mode:'existing',paymentId:savedPayment}:
    mode==='reconcile'?{mode:'reconcile'}:
    {mode:'reserved',reservationId:'44444444-4444-4444-8444-444444444444'}},
  recordCharge:async({paymentId:id})=>{savedPayment=id;calls.saved++},
  markUncertain:async()=>{calls.uncertain++},
 }
 const asaas={
  createChargeWithoutSplit:async(input,opts)=>{
   calls.created++
   assert.equal(input.customerId,customerId)
   assert.equal(input.serviceReference,reference)
   assert.equal(input.amountBRL,100)
   assert.equal(opts.testOnlyChargeAuthorized,true)
   if(failure)throw Error('network_timeout')
   return {...charge}
  },
  getCharge:async()=>{calls.read++;return {...charge}},
  getQr:async()=>brokenQr?{...qr,expirationDate:'2000-01-01T00:00:00Z'}:qr,
 }
 return {repo,asaas,calls}
}
const run=fixture=>issuePostServiceSingleWalletPix({
 serviceId,authenticatedProviderId:providerId,repo:fixture.repo,
 asaas:fixture.asaas,dueDate:'2026-11-17'
})
test('after-service eligible provider creates one Sandbox Pix and gets official QR',async()=>{
 const f=build()
 const result=await run(f)
 assert.equal(result.stage,'awaiting_payment')
 assert.equal(result.reused,false)
 assert.equal(result.qrCopyPaste,qr.payload)
 assert.equal(result.qrImageBase64,qr.encodedImage)
 assert.equal(result.providerPaid,false)
 assert.equal(result.splitSettled,false)
 assert.equal(f.calls.created,1)
 assert.equal(f.calls.saved,1)
 assert.equal(f.calls.read,1)
})
test('already linked attempt only reuses an authenticated remote pending charge',async()=>{
 const f=build({mode:'existing'})
 const result=await run(f)
 assert.equal(result.reused,true)
 assert.equal(f.calls.created,0)
 assert.equal(f.calls.saved,0)
 assert.equal(f.calls.read,1)
})
test('no new Pix if reservation requires reconciliation',async()=>{
 const f=build({mode:'reconcile'})
 await assert.rejects(run(f),/reservation_reconciliation_required/)
 assert.equal(f.calls.created,0)
})
test('server state, evidence, assigned provider and policy gate prevent early Pix',async()=>{
 for(const patch of [
  {estado:'en_progreso'},{evidenceVerified:false},
  {pixAfterServiceAuthorized:false},{paymentTiming:'prepaid'},
  {paymentMethod:'efectivo'},{ambiente:'real'},{moneda:'ARS'},
  {tarifa:-5},{tarifa:100.005},{proveedor_id:clientId}
 ]){
  const ctx=goodContext();Object.assign(ctx.service,patch)
  const f=build({context:ctx})
  await assert.rejects(run(f))
  assert.equal(f.calls.reserved,0)
  assert.equal(f.calls.created,0)
 }
})
test('uncertain network result is never retried automatically',async()=>{
 const f=build({failure:true})
 await assert.rejects(run(f),/processor_creation_uncertain_reconcile_first/)
 assert.equal(f.calls.created,1)
 assert.equal(f.calls.uncertain,1)
 assert.equal(f.calls.saved,0)
})
test('QR readback fails after saving payment but retry never creates a second charge',async()=>{
 const f=build({brokenQr:true})
 await assert.rejects(run(f),/processor_pix_qr_expired_reconcile/)
 assert.equal(f.calls.created,1)
 assert.equal(f.calls.saved,1)
 await assert.rejects(run(f),/processor_pix_qr_expired_reconcile/)
 assert.equal(f.calls.created,1)
 assert.equal(f.calls.saved,1)
 assert.equal(f.calls.uncertain,0)
})
test('no payment is shown as pending unless Asaas confirms charge identity',async()=>{
 const f=build()
 f.asaas.getCharge=async()=>({...charge,status:'RECEIVED'})
 await assert.rejects(run(f),/processor_payment_not_pending/)
 assert.equal(f.calls.saved,1)
 assert.equal(f.calls.created,1)
})
test('no untrusted customer or issuer linkage may issue a charge',async()=>{
 for(const change of [
  {issuerWalletVerified:false},{environment:'production'},
  {customerId:'bad'},{customerClientId:providerId},
  {externalReference:'untrusted_reference'}
 ]){
  const ctx={...goodContext(),...change}
  const f=build({context:ctx})
  await assert.rejects(run(f))
  assert.equal(f.calls.created,0)
 }
})
