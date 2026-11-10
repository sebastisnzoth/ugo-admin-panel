import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const file=new URL('../../payments-sandbox/api/webhook.js',import.meta.url)
const source=readFileSync(file,'utf8')
test('Sandbox webhook route passes Node syntax validation',()=>{
 const p=spawnSync(process.execPath,['--check',file.pathname],{encoding:'utf8'})
 assert.equal(p.status,0,p.stderr)
})
test('Sandbox webhook requires authenticated Preview, isolated TEST database and durable event insertion',()=>{
 assert.match(source,/VERCEL_ENV!=='preview'/)
 assert.match(source,/UGO_PAYMENTS_TEST_ONLY!=='1'/)
 assert.match(source,/asaas-access-token/)
 assert.match(source,/timingSafeEqual/)
 assert.match(source,/ugo_payments_sandbox_rw/)
 assert.match(source,/neon_superuser/)
 assert.match(source,/payment_events/)
 assert.match(source,/on conflict \(event_id\) do nothing/)
 assert.match(source,/event_id_conflict/)
 assert.doesNotMatch(source,/api\.asaas\.com\//)
 assert.doesNotMatch(source,/update ugo_payments_v2\.payment_intents/)
 assert.doesNotMatch(source,/providerPaid:true|splitSettled:true/)
})
