import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcileInboxEvent} from '../../payments-sandbox/lib/reconcileInboxEvent.js'
const evt={event_id:'evt_abc&test',kind:'PAYMENT_RECEIVED',processor_payment_id:'pay_abc',status:'received'}
const intent={id:'a2f093c7-b38d-4c8f-a48d-d904978fd2d5',
 asaas_payment_id:'pay_abc',asaas_customer_id:'cus_abc',
 external_reference:'ugo_test_a2f093c7b38d4c8fa48dd904978fd2d5',gross_cents:10000,
 net_cents:null,status:'pending'}
const receipt={id:'pay_abc',customer:'cus_abc',billingType:'PIX',
 externalReference:intent.external_reference,value:100,netValue:99.01,status:'RECEIVED'}
function dbFixture({event=evt,payment=intent}={}){
 let committed=0,rollbacks=0,updates=0,locks=0;
 const db={async query(sql){
  const a=String(sql)
  if(a==='BEGIN')return {rows:[]}
  if(a==='COMMIT'){committed++;return {rows:[]}}
  if(a==='ROLLBACK'){rollbacks++;return {rows:[]}}
  if(a.includes('select event_id,kind,processor_payment_id,status')){locks++;return {rows:[event]}}
  if(a.includes('from ugo_payments_v2.payment_intents'))return {rows:[payment]}
  if(a.includes('update ugo_payments_v2.payment_intents')){updates++;return {rows:[{id:intent.id}]}}
  if(a.includes('update ugo_payments_v2.payment_events'))return {rows:[{event_id:evt.event_id}]}
  throw Error('unexpected_query')
 }}
 return {db,metrics:()=>({committed,rollbacks,updates,locks})}
}
test('authentic RECEIVED updates isolated TEST intent atomically',async()=>{
 const f=dbFixture()
 const result=await reconcileInboxEvent({db:f.db,eventId:evt.event_id,asaasGet:async()=>receipt})
 assert.equal(result.state,'received')
 assert.equal(result.receivedVerified,true)
 assert.equal(result.providerPaid,false)
 assert.equal(result.splitSettled,false)
 assert.deepEqual(f.metrics(),{committed:1,rollbacks:0,updates:1,locks:1})
})
test('duplicate processed webhook never credits twice',async()=>{
 const f=dbFixture({event:{...evt,status:'processed'}})
 const result=await reconcileInboxEvent({db:f.db,eventId:evt.event_id,asaasGet:async()=>{throw Error('should_not_fetch')}})
 assert.equal(result.state,'duplicate')
 assert.equal(f.metrics().updates,0)
 assert.equal(f.metrics().committed,1)
})
test('forged payment identity, unconfirmed status or impossible net rolls back',async()=>{
 for(const forged of [
  {...receipt,id:'pay_other'},{...receipt,customer:'cus_other'},
  {...receipt,externalReference:'wrong'},{...receipt,value:50},
  {...receipt,status:'PENDING'},{...receipt,netValue:1000}
 ]){
  const f=dbFixture()
  await assert.rejects(reconcileInboxEvent({db:f.db,eventId:evt.event_id,asaasGet:async()=>forged}))
  assert.equal(f.metrics().updates,0)
  assert.equal(f.metrics().committed,0)
  assert.equal(f.metrics().rollbacks,1)
 }
})
test('out-of-order CONFIRMED event never regresses RECEIVED',async()=>{
 const f=dbFixture({event:{...evt,kind:'PAYMENT_CONFIRMED'},payment:{...intent,status:'received',net_cents:9901}})
 await assert.rejects(reconcileInboxEvent({db:f.db,eventId:evt.event_id,asaasGet:async()=>({...receipt,status:'CONFIRMED'})}),/regression/)
 assert.equal(f.metrics().updates,0)
 assert.equal(f.metrics().rollbacks,1)
})
test('CONFIRMED may be recorded as confirmed but never claimed received',async()=>{
 const f=dbFixture({event:{...evt,kind:'PAYMENT_CONFIRMED'}})
 const r=await reconcileInboxEvent({db:f.db,eventId:evt.event_id,asaasGet:async()=>({...receipt,status:'CONFIRMED'})})
 assert.equal(r.state,'confirmed')
 assert.equal(r.receivedVerified,false)
})
test('control characters in event ID are rejected before database interaction',async()=>{
 const f=dbFixture()
 await assert.rejects(reconcileInboxEvent({db:f.db,eventId:'evt\nsecret',asaasGet:async()=>receipt}),/invalid_webhook_event_id/)
 assert.deepEqual(f.metrics(),{committed:0,rollbacks:0,updates:0,locks:0})
})
