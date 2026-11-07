import test from 'node:test'
import assert from 'node:assert/strict'
import { issueSandboxPixQr } from '../../src/server/payments/asaasPixCheckoutFlow.mjs'
const wallet='ab5b5a59-f2eb-40eb-8b8b-bb7314685a33'
const issuer='b7f0bd20-06ee-4ce3-857c-c7868e8d071b'
const context={
  service:{id:'svc_1',cliente_id:'cli_1',proveedor_id:'pro_1',estado:'completado',moneda:'BRL',tarifa:100},
  providerAccount:{proveedor_id:'pro_1',walletId:wallet,verified:true,environment:'sandbox'},
  issuerWalletId:issuer,issuerWalletVerified:true,
  customerLink:{ugoClientId:'cli_1',asaasCustomerId:'cus_1',environment:'sandbox'},
  payment:null,
}
const args={serviceId:'svc_1',authenticatedProviderId:'pro_1',dueDate:'2026-11-10'}
function makeRepo({reservation={mode:'reserved',reservationId:'res_1'},ctx=context}={}){
 const calls=[]
 const repo={
  loadContext:async()=>ctx,
  reservePix:async()=>{calls.push('reserve');return reservation},
  recordProcessorCharge:async()=>{calls.push('persist')},
  markUncertain:async()=>{calls.push('uncertain')},
 }
 return {repo,calls}
}
function makeProcessor({failCreate=false}={}){
 const calls=[]
 const asaas={
  createChargeWithSplit:async(input)=>{calls.push(['create',input]);if(failCreate)throw Error('timeout');return {id:'pay_1'}},
  getQr:async()=>{calls.push(['qr']);return {copyPasteCode:'pix_test',qrCodeImageBase64:'base64'}},
  getCharge:async()=>{calls.push(['lookup']);return {
    id:'pay_1',externalReference:'svc_1',customer:'cus_1',billingType:'PIX',
    value:100,status:'PENDING',
  }},
 }
 return {asaas,calls}
}
test('isolated provider checkout reserves before calling Asaas and returns QR without claiming payment',async()=>{
 const x=makeRepo(),y=makeProcessor()
 const result=await issueSandboxPixQr({...args,repo:x.repo,asaas:y.asaas})
 assert.equal(result.state,'awaiting_payment')
 assert.equal(result.paymentId,'pay_1')
 assert.equal(result.reused,false)
 assert.deepEqual(x.calls,['reserve','persist'])
 assert.equal(y.calls[0][0],'create')
 assert.equal(y.calls[0][1].providerWalletId,wallet)
 assert.equal(y.calls[0][1].providerSharePercent,85)
})
test('pending existing processor charge reused with fresh verified processor state',async()=>{
 const x=makeRepo({reservation:{mode:'existing',paymentId:'pay_1'}}),y=makeProcessor()
 const result=await issueSandboxPixQr({...args,repo:x.repo,asaas:y.asaas})
 assert.equal(result.reused,true)
 assert.deepEqual(y.calls.map(z=>z[0]),['lookup','qr'])
})
test('unverified issuer or foreign provider are rejected before reservation',async()=>{
 for(const patch of [
  {issuerWalletVerified:false},
  {service:{...context.service,proveedor_id:'other'}},
  {customerLink:{...context.customerLink,ugoClientId:'other'}},
 ]){
  const x=makeRepo({ctx:{...context,...patch}}),y=makeProcessor()
  await assert.rejects(issueSandboxPixQr({...args,repo:x.repo,asaas:y.asaas}))
  assert.equal(x.calls.length,0)
  assert.equal(y.calls.length,0)
 }
})
test('processor timeout marks attempt uncertain and never retries charge',async()=>{
 const x=makeRepo(),y=makeProcessor({failCreate:true})
 await assert.rejects(issueSandboxPixQr({...args,repo:x.repo,asaas:y.asaas}),/uncertain/)
 assert.deepEqual(x.calls,['reserve','uncertain'])
 assert.deepEqual(y.calls.map(z=>z[0]),['create'])
})
test('repository reconciliation state blocks Asaas requests',async()=>{
 const x=makeRepo({reservation:{mode:'reconcile'}}),y=makeProcessor()
 await assert.rejects(issueSandboxPixQr({...args,repo:x.repo,asaas:y.asaas}),/reconciliation/)
 assert.deepEqual(y.calls,[])
})
