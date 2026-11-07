import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const route=new URL('../../payments-sandbox/api/pix.js',import.meta.url)
const source=readFileSync(route,'utf8')

test('isolated Sandbox Pix controller passes Node syntax validation',()=>{
 const check=spawnSync(process.execPath,['--check',route.pathname],{encoding:'utf8'})
 assert.equal(check.status,0,check.stderr)
})

test('Pix backend requires POST bearer authentication and Preview gating',()=>{
 assert.match(source,/req\.method\s*!==\s*'POST'/)
 assert.match(source,/timingSafeEqual/)
 assert.match(source,/UGO_TEST_OPERATOR_TOKEN/)
 assert.match(source,/VERCEL_ENV\s*!==\s*'preview'/)
 assert.match(source,/UGO_PAYMENTS_TEST_ONLY/)
 assert.doesNotMatch(source,/https:\/\/api\.asaas\.com\//)
 assert.match(source,/https:\/\/api-sandbox\.asaas\.com\/v3/)
})

test('single-charge reservation uses transaction and unique service locking',()=>{
 assert.match(source,/await db\.query\('BEGIN'\)/)
 assert.match(source,/from ugo_payments_v2\.test_services where id=\$1 for update/)
 assert.match(source,/ugo_payments_v2\.payment_intents/)
 assert.match(source,/existing_reservation_requires_reconciliation/)
 assert.match(source,/unknown_processor_result/)
 assert.match(source,/create_uncertain_stop_and_reconcile/)
 assert.match(source,/no_duplicate_post|existing\.asaas_payment_id|prior\.asaas_payment_id/)
})

test('confirmation is explicit, processor-readback based and fails closed',()=>{
 assert.match(source,/\['create','confirm','reconcile'\]/)
 assert.match(source,/getVerifiedPayment/)
 assert.match(source,/another_confirmation_in_progress/)
 assert.match(source,/confirmation_uncertain_reconcile_without_retry/)
 assert.match(source,/\/sandbox\/payment\//)
 assert.match(source,/LOCAL_SIMULATION_ONLY/)
 assert.match(source,/splitSettled:false/)
 assert.match(source,/providerPaid:false/)
})
