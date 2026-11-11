import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const sqlFile = async path => readFile(new URL('../../docs/sql/'+path,import.meta.url),'utf8')
const values=[
 '00000000-0000-4000-8000-000000009001',
 '00000000-0000-4000-8000-000000009002',
 '00000000-0000-4000-8000-000000009003',
 '00000000-0000-4000-8000-000000009004',
 10000,
 'synthetic_service_9002',
]
const call='select * from ugo_payments_v2.reserve_pix_test($1,$2,$3,$4,$5,$6)'
test('private TEST-only reservation prevents creation of two Pix attempts for the same service',async()=>{
 const db=new PGlite()
 try{
  await db.exec(await sqlFile('ugo_pagamentos_v2_isolated_test_schema.sql'))
  await db.exec(await sqlFile('ugo_pagamentos_v2_reserve_pix_test.sql'))
  const first=await db.query(call,values)
  const second=await db.query(call,values)
  assert.equal(first.rows[0].mode,'reserved')
  assert.equal(second.rows[0].mode,'reconcile')
  assert.equal(first.rows[0].intent_id,second.rows[0].intent_id)
  const count=await db.query('select count(*)::int as n from ugo_payments_v2.payment_intents')
  assert.equal(count.rows[0].n,1)
  await assert.rejects(db.query(call,[values[0],values[1],values[2],
    '00000000-0000-4000-8000-000000009099',values[4],values[5]]),/ownership|tariff/)
 }finally{await db.close()}
})
test('sandbox reservation rejects zero or negative payments and invalid IDs',async()=>{
 const db=new PGlite()
 try{
  await db.exec(await sqlFile('ugo_pagamentos_v2_isolated_test_schema.sql'))
  await db.exec(await sqlFile('ugo_pagamentos_v2_reserve_pix_test.sql'))
  await assert.rejects(db.query(call,[...values.slice(0,4),0,values[5]]),/Invalid Pix reservation/)
  await assert.rejects(db.query(call,[...values.slice(0,4),values[4],'x']),/Invalid Pix reservation/)
 }finally{await db.close()}
})
