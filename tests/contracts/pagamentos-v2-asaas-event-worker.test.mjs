import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { reconcileStoredAsaasSandboxEvent } from '../../src/server/payments/asaasSandboxPaymentEventWorker.mjs'
import { ingestAsaasSandboxWebhook } from '../../src/server/payments/asaasSandboxWebhookInbox.mjs'

const intent='00000000-0000-4000-8000-000000007701'
const service='00000000-0000-4000-8000-000000007702'
const customer='00000000-0000-4000-8000-000000007703'
const provider='00000000-0000-4000-8000-000000007704'
const wallet='ab5b5a59-f2eb-40eb-8b8b-bb7314685a33'
const secret='sandbox_test_webhook_secret_very_long_123'
const processor=(status='RECEIVED',patch={})=>({
 id:'pay_7701',externalReference:'ugo_test_7701',customer:'cus_7701',
 billingType:'PIX',value:100,netValue:98,status,...patch,
})
async function setup(){
 const db=new PGlite()
 const sql=await readFile(new URL('../../docs/sql/ugo_pagamentos_v2_isolated_test_schema.sql',import.meta.url),'utf8')
 await db.exec(sql)
 await db.query(`insert into ugo_payments_v2.payment_intents
 (id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,status,
  external_reference,asaas_payment_id,asaas_customer_id,asaas_provider_wallet_id)
 values($1,$2,$3,$4,10000,'pending','ugo_test_7701','pay_7701','cus_7701',$5)`,
 [intent,service,customer,provider,wallet])
 const webhook=async(id='evt_7701',paymentId='pay_7701')=>ingestAsaasSandboxWebhook({
  db,method:'POST',token:secret,expectedToken:secret,
  rawBody:JSON.stringify({id,event:'PAYMENT_RECEIVED',payment:{id:paymentId}}),
 })
 return {db,webhook}
}
test('authenticated processor GET reconciles a durable webhook atomically without settling Split',async()=>{
 const {db,webhook}=await setup()
 try{
  assert.equal((await webhook()).status,200)
  let fetched=0
  const asaas={getCharge:async()=>{fetched++;return processor()}}
  const result=await reconcileStoredAsaasSandboxEvent({db,asaas,eventId:'evt_7701'})
  assert.deepEqual(result,{kind:'received',paymentState:'received',splitSettled:false,escrowReleased:false})
  assert.equal(fetched,1)
  const i=(await db.query('select status,net_cents from ugo_payments_v2.payment_intents')).rows[0]
  assert.equal(i.status,'received')
  assert.equal(Number(i.net_cents),9800)
  assert.equal((await db.query('select status from ugo_payments_v2.payment_events')).rows[0].status,'processed')
  assert.deepEqual(await reconcileStoredAsaasSandboxEvent({db,asaas,eventId:'evt_7701'}),{kind:'duplicate'})
  assert.equal(fetched,1)
 }finally{await db.close()}
})
test('spoofed payment ID, mismatched reference and amount cannot confirm Pix',async()=>{
 for(const patch of [{id:'pay_spoof'},{externalReference:'wrong'},{customer:'cus_other'},{value:90}]){
  const {db,webhook}=await setup()
  try{
   await webhook()
   await assert.rejects(reconcileStoredAsaasSandboxEvent({
    db,asaas:{getCharge:async()=>processor('RECEIVED',patch)},eventId:'evt_7701',
   }),/mismatch/)
   assert.equal((await db.query('select status from ugo_payments_v2.payment_intents')).rows[0].status,'pending')
   assert.equal((await db.query('select status from ugo_payments_v2.payment_events')).rows[0].status,'received')
  }finally{await db.close()}
 }
})
test('confirmed payment remains distinct from received, and split remains unverified',async()=>{
 const {db,webhook}=await setup()
 try{
  await webhook()
  const r=await reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>processor('CONFIRMED')},eventId:'evt_7701',
  })
  assert.equal(r.paymentState,'confirmed')
  assert.equal(r.splitSettled,false)
  assert.equal((await db.query('select net_cents from ugo_payments_v2.payment_intents')).rows[0].net_cents,null)
 }finally{await db.close()}
})
test('unknown payment cannot be used for arbitrary authenticated Asaas lookup',async()=>{
 const {db,webhook}=await setup()
 try{
  await webhook('evt_other','pay_unknown')
  let called=false
  await assert.rejects(reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>{called=true;return processor()}},eventId:'evt_other',
  }),/Unknown Asaas payment/)
  assert.equal(called,false)
 }finally{await db.close()}
})
test('processor state regression does not reverse previously received value',async()=>{
 const {db,webhook}=await setup()
 try{
  await db.query("update ugo_payments_v2.payment_intents set status='received',net_cents=9800")
  await webhook()
  await assert.rejects(reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>processor('PENDING')},eventId:'evt_7701',
  }),/regression/)
  assert.equal((await db.query('select status from ugo_payments_v2.payment_intents')).rows[0].status,'received')
 }finally{await db.close()}
})

test('missing original recipient wallet cannot be reconciled as received',async()=>{
 const {db,webhook}=await setup()
 try{
  await webhook()
  await db.query('update ugo_payments_v2.payment_intents set asaas_provider_wallet_id=null')
  let fetched=false
  await assert.rejects(reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>{fetched=true;return processor()}},eventId:'evt_7701',
  }),/Incomplete persisted TEST payment metadata/)
  assert.equal(fetched,false)
  assert.equal((await db.query('select status from ugo_payments_v2.payment_intents')).rows[0].status,'pending')
 }finally{await db.close()}
})

test('Asaas event IDs containing ampersand remain processable end to end',async()=>{
 const {db,webhook}=await setup()
 try{
  const id='evt_05b708f961d739ea7eba7e4db318f621&368604920'
  assert.equal((await webhook(id)).status,200)
  const result=await reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>processor()},eventId:id,
  })
  assert.equal(result.paymentState,'received')
  assert.equal((await db.query('select status from ugo_payments_v2.payment_events where event_id=$1',[id])).rows[0].status,'processed')
 }finally{await db.close()}
})

test('Split DONE webhook is held for separate reconciliation, never silently processed as payment',async()=>{
 const {db,webhook}=await setup()
 try{
  await webhook('evt_split_1')
  await db.query("update ugo_payments_v2.payment_events set kind='PAYMENT_SPLIT_DONE' where event_id='evt_split_1'")
  let consulted=false
  await assert.rejects(reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>{consulted=true;return processor()}},eventId:'evt_split_1',
  }),/Split event requires independent settlement/)
  assert.equal(consulted,false)
  const event=(await db.query("select status from ugo_payments_v2.payment_events where event_id='evt_split_1'")).rows[0]
  assert.equal(event.status,'received')
 }finally{await db.close()}
})

test('out-of-order CONFIRMED cannot downgrade previously received Pix',async()=>{
 const {db,webhook}=await setup()
 try{
  await db.query("update ugo_payments_v2.payment_intents set status='received',net_cents=9800")
  await webhook('evt_stale_confirmed')
  await assert.rejects(reconcileStoredAsaasSandboxEvent({
   db,asaas:{getCharge:async()=>processor('CONFIRMED')},eventId:'evt_stale_confirmed',
  }),/regression/)
  const row=(await db.query('select status,net_cents from ugo_payments_v2.payment_intents')).rows[0]
  assert.equal(row.status,'received')
  assert.equal(Number(row.net_cents),9800)
  assert.equal((await db.query("select status from ugo_payments_v2.payment_events where event_id='evt_stale_confirmed'")).rows[0].status,'received')
 }finally{await db.close()}
})
