import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const schemaUrl=new URL('../../docs/sql/ugo_pagamentos_v2_isolated_test_schema.sql',import.meta.url)
const ids={
  svc:'00000000-0000-4000-8000-000000000001',
  client:'00000000-0000-4000-8000-000000000002',
  provider:'00000000-0000-4000-8000-000000000003',
  intent:'00000000-0000-4000-8000-000000000004',
  other:'00000000-0000-4000-8000-000000000005',
}
test('financial schema runs in isolated in-memory PostgreSQL and enforces charge + webhook uniqueness',async()=>{
 const db=new PGlite()
 try {
  await db.exec(await readFile(schemaUrl,'utf8'))
  await db.query(`insert into ugo_payments_v2.payment_intents
    (id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,external_reference)
    values ($1,$2,$3,$4,10000,'svc_test')`,
    [ids.intent,ids.svc,ids.client,ids.provider])
  await assert.rejects(db.query(`insert into ugo_payments_v2.payment_intents
    (id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,external_reference)
    values ($1,$2,$3,$4,10000,'svc_test_other')`,
    [ids.other,ids.svc,ids.client,ids.provider]),/duplicate key/)
  await db.query(`insert into ugo_payments_v2.payment_events
    (event_id,processor_payment_id,kind) values ('evt_1','pay_1','PAYMENT_RECEIVED')`)
  await assert.rejects(db.query(`insert into ugo_payments_v2.payment_events
    (event_id,processor_payment_id,kind) values ('evt_1','pay_1','PAYMENT_RECEIVED')`),/duplicate key/)
  const result=await db.query(`select count(*)::int as count from ugo_payments_v2.payment_events`)
  assert.equal(result.rows[0].count,1)
 } finally {await db.close()}
})
test('financial schema constrains sandbox-only environment and valid positive cents',async()=>{
 const db=new PGlite()
 try {
  await db.exec(await readFile(schemaUrl,'utf8'))
  await assert.rejects(db.query(`insert into ugo_payments_v2.payment_intents
   (id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,environment,external_reference)
   values ($1,$2,$3,$4,10000,'production','bad_env')`,
   [ids.intent,ids.svc,ids.client,ids.provider]),/check constraint/)
  await assert.rejects(db.query(`insert into ugo_payments_v2.payment_intents
   (id,ugo_service_id,ugo_client_id,ugo_provider_id,gross_cents,external_reference)
   values ($1,$2,$3,$4,-1,'bad_money')`,
   [ids.intent,ids.svc,ids.client,ids.provider]),/check constraint/)
 } finally {await db.close()}
})
