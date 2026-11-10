import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {ingestAsaasSandboxWebhook} from '../../src/server/payments/asaasSandboxWebhookInbox.mjs'

const token='sandbox_webhook_secret_of_at_least_32_chars'
const json=(id='evt_1',paymentId='pay_1',kind='PAYMENT_RECEIVED')=>
 JSON.stringify({id,event:kind,payment:{id:paymentId}})
async function setup() {
 const db=new PGlite()
 const sql=await readFile(new URL('../../docs/sql/ugo_pagamentos_v2_isolated_test_schema.sql',import.meta.url),'utf8')
 await db.exec(sql)
 const post=({method='POST',actual=token,body=json(),store=db}={})=>
  ingestAsaasSandboxWebhook({method,token:actual,expectedToken:token,rawBody:body,db:store})
 return {db,post}
}

test('Asaas Sandbox webhook is durably saved before success response and never credits a payment',async()=>{
 const {db,post}=await setup()
 try {
  assert.deepEqual(await post(),{status:200,body:{accepted:true,duplicate:false}})
  const events=await db.query('select event_id,processor_payment_id,status from ugo_payments_v2.payment_events')
  assert.deepEqual(events.rows,[{event_id:'evt_1',processor_payment_id:'pay_1',status:'received'}])
  const intents=await db.query('select count(*)::int as n from ugo_payments_v2.payment_intents')
  assert.equal(intents.rows[0].n,0)
 }finally{await db.close()}
})
test('duplicate webhook is idempotent and conflicting event identity rejected',async()=>{
 const {db,post}=await setup()
 try{
  assert.equal((await post()).status,200)
  assert.deepEqual(await post(),{status:200,body:{accepted:true,duplicate:true}})
  assert.equal((await post({body:json('evt_1','pay_other')})).status,409)
  const n=await db.query('select count(*)::int as n from ugo_payments_v2.payment_events')
  assert.equal(n.rows[0].n,1)
 }finally{await db.close()}
})
test('invalid method, authentication or payload never result in persisted webhook',async()=>{
 const {db,post}=await setup()
 try{
  assert.equal((await post({method:'GET'})).status,405)
  assert.equal((await post({actual:'wrong'})).status,401)
  assert.equal((await post({body:'not-json'})).status,400)
  assert.equal((await post({body:JSON.stringify({id:'evt_1',event:'PAYMENT_RECEIVED'})})).status,400)
  const n=await db.query('select count(*)::int as n from ugo_payments_v2.payment_events')
  assert.equal(n.rows[0].n,0)
 }finally{await db.close()}
})
test('storage failure never acknowledges an unrecorded Asaas payment event',async()=>{
 const {db,post}=await setup()
 try{
  const result=await post({store:{query:async()=>{throw Error('db offline')}}})
  assert.deepEqual(result,{status:503,body:{error:'event_persistence_failed'}})
 }finally{await db.close()}
})
test('concurrent duplicate events commit once',async()=>{
 const {db,post}=await setup()
 try {
  const replies=await Promise.all([post(),post(),post()])
  assert.deepEqual(replies.map(x=>x.status),[200,200,200])
  assert.equal(replies.filter(x=>x.body.duplicate===false).length,1)
  const n=await db.query('select count(*)::int as n from ugo_payments_v2.payment_events')
  assert.equal(n.rows[0].n,1)
 }finally{await db.close()}
})
