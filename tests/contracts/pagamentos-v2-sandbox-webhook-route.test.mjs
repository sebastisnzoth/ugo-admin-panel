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

test('Asaas event IDs may include ampersands and printable symbols but not control chars',()=>{
 assert.match(source,/const eventIdValid=/)
 assert.match(source,/charCodeAt\(0\)<32/)
 assert.match(source,/!eventIdValid\(event\.id\)/)
 assert.doesNotMatch(source,/!ID\.test\(event\.id\|\|''\)/)
})

test('reject unknown webhook charges without pretending receipt or filling the inbox',()=>{
 const guard=source.indexOf("const linked=await db.query")
 const insert=source.indexOf("insert into ugo_payments_v2.payment_events")
 assert.ok(guard>0&&insert>guard)
 assert.match(source,/asaas_payment_id=\$1 limit 2/)
 assert.match(source,/payment_not_yet_linked/)
 assert.match(source,/return send\(res,503,\{error:'payment_not_yet_linked'\}\)/)
})
