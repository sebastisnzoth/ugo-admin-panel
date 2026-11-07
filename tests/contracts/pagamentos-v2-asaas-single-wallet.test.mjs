import test from 'node:test'
import assert from 'node:assert/strict'
import {
 AsaasPixQrSandbox,buildPixWithoutSplit,
} from '../../src/server/payments/asaasPixQrSandbox.mjs'
import {
 projectLocalSandboxSplit,reconcileStandaloneSandboxPix,
} from '../../src/server/payments/asaasSandboxSingleWalletSettlement.mjs'

const input={customerId:'cus_12345',amountBRL:100,dueDate:'2026-11-17',serviceReference:'ugo_test_pix_1'}
const processor={id:'pay_test_1',externalReference:input.serviceReference,
 customer:input.customerId,billingType:'PIX',status:'RECEIVED',value:100,netValue:98}
const expected={paymentId:processor.id,serviceReference:input.serviceReference,
 customerId:input.customerId,amountBRL:100}

test('standalone Pix charge contains no split and disables notifications',()=>{
 const body=buildPixWithoutSplit(input)
 assert.deepEqual(body,{customer:'cus_12345',billingType:'PIX',value:100,
  dueDate:'2026-11-17',externalReference:'ugo_test_pix_1',notificationDisabled:true})
 assert.equal('split' in body,false)
 assert.throws(()=>buildPixWithoutSplit({...input,amountBRL:0}),/Invalid amount/)
 assert.throws(()=>buildPixWithoutSplit({...input,dueDate:'2026-02-30'}),/Invalid dueDate/)
})
test('standalone Pix charge requires explicit TEST authorization and rejects split fields',async()=>{
 const called=[]
 const asaas=new AsaasPixQrSandbox({apiKey:'fixture-only',fetchImpl:async(url,init)=>{
  called.push({url,init});return {ok:true,json:async()=>({id:'pay_test_1',status:'PENDING'})}
 }})
 await assert.rejects(asaas.createChargeWithoutSplit(input),/authorization/)
 await assert.rejects(asaas.createChargeWithoutSplit({...input,split:[]},{testOnlyChargeAuthorized:true}),/must not/)
 await assert.rejects(asaas.createChargeWithoutSplit({...input,providerWalletId:'bad'},{testOnlyChargeAuthorized:true}),/must not/)
 assert.equal(called.length,0)
 const charge=await asaas.createChargeWithoutSplit(input,{testOnlyChargeAuthorized:true})
 assert.equal(charge.status,'PENDING')
 assert.equal(called.length,1)
 assert.equal(called[0].url,'https://api-sandbox.asaas.com/v3/payments')
 assert.equal(called[0].init.method,'POST')
 assert.equal('split' in JSON.parse(called[0].init.body),false)
})
test('single-wallet local 85/15 never claims external settlement',()=>{
 const projection=projectLocalSandboxSplit({netCents:9800,issuerWalletVerified:true})
 assert.equal(projection.providerCents,8330)
 assert.equal(projection.ugoCents,1470)
 assert.equal(projection.netCents,9800)
 assert.equal(projection.mode,'LOCAL_SIMULATION_ONLY')
 for(const k of ['splitSettled','providerPaid','ledgerPosted','escrowAvailable','recipientWalletVerified'])
  assert.equal(projection[k],false)
 assert.equal(projectLocalSandboxSplit({netCents:101,issuerWalletVerified:true}).providerCents,86)
 assert.throws(()=>projectLocalSandboxSplit({netCents:10000}),/verified issuer/)
 assert.throws(()=>projectLocalSandboxSplit({netCents:9800,issuerWalletVerified:true,providerShareBps:10000}),/verified issuer/)
})
test('authenticated RECEIVED charge can be modeled but not financially settled',()=>{
 const received=reconcileStandaloneSandboxPix({payment:processor,expected,issuerWalletVerified:true})
 assert.equal(received.kind,'received')
 assert.equal(received.simulation.providerCents,8330)
 assert.equal(received.simulation.ugoCents,1470)
 assert.equal(received.splitSettled,false)
 assert.equal(received.providerPaid,false)
 assert.equal(received.ledgerPosted,false)
})
test('PENDING or CONFIRMED cannot allocate or pay a simulated provider',()=>{
 for(const status of ['PENDING','CONFIRMED']){
  const result=reconcileStandaloneSandboxPix({payment:{...processor,status},expected,issuerWalletVerified:true})
  assert.equal(result.simulation,null)
  assert.equal(result.providerPaid,false)
  assert.equal(result.splitSettled,false)
 }
 assert.throws(()=>reconcileStandaloneSandboxPix({payment:{...processor,externalReference:'wrong'},expected,issuerWalletVerified:true}),/identity/)
 assert.throws(()=>reconcileStandaloneSandboxPix({payment:processor,expected,issuerWalletVerified:false}),/verified issuer/)
})
test('Asaas Sandbox synthetic confirmation refuses unapproved calls',async()=>{
 const calls=[]
 const asaas=new AsaasPixQrSandbox({apiKey:'fixture-only',fetchImpl:async(url,init)=>{
   calls.push({url,method:init.method});return {ok:true,json:async()=>({id:'pay_test_1',status:'CONFIRMED'})}
 }})
 await assert.rejects(asaas.confirmSyntheticPayment('pay_test_1'),/authorization/)
 assert.equal(calls.length,0)
 const confirmed=await asaas.confirmSyntheticPayment('pay_test_1',{testOnlyConfirmationAuthorized:true})
 assert.equal(confirmed.id,'pay_test_1')
 assert.deepEqual(calls,[{url:'https://api-sandbox.asaas.com/v3/sandbox/payment/pay_test_1/confirm',method:'POST'}])
})
