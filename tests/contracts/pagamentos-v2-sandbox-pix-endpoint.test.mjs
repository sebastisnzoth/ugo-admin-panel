import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {runInNewContext} from 'node:vm'
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
 assert.match(source,/\['create','confirm','reconcile','recover_create','diagnose','audit_intents','prepare_customer','verify_received','get_qr'\]/)
 assert.match(source,/getVerifiedPayment/)
 assert.match(source,/another_confirmation_in_progress/)
 assert.match(source,/confirmation_uncertain_reconcile_without_retry/)
 assert.match(source,/\/sandbox\/payment\//)
 assert.match(source,/LOCAL_SIMULATION_ONLY/)
 assert.match(source,/splitSettled:false/)
 assert.match(source,/providerPaid:false/)
})

test('read-only diagnostics returns only safe flags and does not create charges',()=>{
 assert.match(source,/async function diagnose\(db\)/)
 assert.match(source,/payerDocumentPresent/)
 assert.match(source,/accountApproved/)
 assert.match(source,/remoteLookupConclusive/)
 assert.match(source,/financialWritesPerformed:false/)
 assert.match(source,/action==='diagnose'\?await diagnose\(db\)/)
 const section=source.split('async function diagnose(db){')[1]?.split('export default async function handler')[0]||''
 assert.doesNotMatch(section,/processor\([^,\n]+,'POST'/)
 assert.doesNotMatch(section,/db\.query\([\s\S]*?\b(?:update|insert|delete)\b/i)
})

test('Sandbox Pix rejects missing payer document before any charge reservation',()=>{
 assert.match(source,/payer_document_missing/)
 assert.match(source,/customer\.cpfCnpj/)
 const preflight=source.split('async function preflight(){')[1]?.split('async function dbConnect()')[0]||''
 assert.match(preflight,/throw Error\('payer_document_missing'\)/)
 assert.doesNotMatch(preflight,/processor\('\/payments','POST'/)
})

test('read-only audit checks canonical Sandbox payment references without exposing identifiers',()=>{
 assert.match(source,/async function auditIntents\(db\)/)
 assert.match(source,/where environment='sandbox' order by created_at asc limit 21/)
 assert.match(source,/legacySyntheticSkipped/)
 assert.match(source,/remoteAmbiguous/)
 assert.match(source,/readyForAutomaticRetry:false,financialWritesPerformed:false/)
 assert.match(source,/action==='audit_intents'\?await auditIntents\(db\)/)
 const section=source.split('async function auditIntents(db){')[1]?.split('export default async function handler')[0]||''
 assert.ok(section.includes("await processor('/payments?limit=2&offset=0&externalReference='"))
 assert.doesNotMatch(section,/processor\([^,\n]+,'POST'/)
 assert.doesNotMatch(section,/db\.query\([\s\S]*?\b(?:update|insert|delete)\b/i)
 assert.doesNotMatch(section,/return Object\.freeze\(\{[^}]*external_reference/s)
})

test('operator may prepare sole existing fictitious Sandbox payer without another real CPF',()=>{
 assert.match(source,/async function prepareCustomer\(\)/)
 assert.match(source,/const customer=await verifiedCustomer\(\)/)
 assert.match(source,/processor\('\/customers\/'\+encodeURIComponent\(customer\.id\),'PUT'/)
 assert.match(source,/notificationDisabled:true/)
 assert.match(source,/sandboxCustomerUpdated:true/)
 assert.match(source,/action==='prepare_customer'\?await prepareCustomer\(\)/)
 const section=source.split('async function prepareCustomer(){')[1]?.split('async function dbConnect()')[0]||''
 assert.doesNotMatch(section,/processor\('\/payments','POST'/)
 assert.doesNotMatch(section,/processor\('\/customers','POST'/)
 const response=section.split("return {action:'prepare_customer',alreadyPrepared:false")[1]||''
 assert.ok(response)
 assert.doesNotMatch(response,/cpfCnpj|cpf:/)
})

test('generated CPF has valid check digits and only runs in isolated Sandbox operator action',()=>{
 const chunk=source.split('function syntheticSandboxCpf(){')[1]?.split('async function prepareCustomer(){')[0]
 assert.ok(chunk)
 const sample=runInNewContext('function syntheticSandboxCpf(){'+chunk+
  '\nsyntheticSandboxCpf()', {randomInt:()=>123456789})
 assert.equal(sample,'12345678909')
 assert.match(source,/process\.env\.VERCEL_ENV!=='preview'/)
 assert.match(source,/process\.env\.UGO_PAYMENTS_TEST_ONLY!=='1'/)
 assert.match(source,/UGO_TEST_OPERATOR_TOKEN/)
})

test('received Pix attestation is processor-authenticated and never performs financial writes',()=>{
 const section=source.split('async function verifyReceived(db){')[1]?.split('/**\n * Authenticated, read-only reconciliation inventory')[0]||''
 assert.ok(section.length>150)
 assert.match(section,/await existing\(db\)/)
 assert.match(section,/row\.status!=='received'/)
 assert.match(section,/await getVerifiedPayment\(row\)/)
 assert.match(section,/payment\.status==='RECEIVED'/)
 assert.match(section,/netCents===Number\(row\.net_cents\)/)
 assert.match(section,/external_reference!==expected/)
 assert.match(section,/financialWritesPerformed:false/)
 assert.match(section,/e2ePass:false/)
 assert.match(section,/splitSettled:false,providerPaid:false/)
 assert.doesNotMatch(section,/processor\([^)]*,'POST'/)
 assert.doesNotMatch(section,/db\.query\(/)
 assert.doesNotMatch(section,/qrCopyPaste|qrImageBase64|asaas_payment_id:\s*row/)
 assert.match(source,/action==='verify_received'\?await verifyReceived\(db\)/)
 assert.match(source,/'received_intent_not_ready_for_verification'/)
 assert.match(source,/'received_intent_identity_mismatch'/)
})

test('operator can retrieve only an already-linked pending QR without new charges',()=>{
 const section=source.split('async function getPendingQr(db){')[1]?.split('async function confirm(db){')[0]||''
 assert.ok(section.length>200)
 assert.match(section,/row\.status!=='pending'/)
 assert.match(section,/await getVerifiedPayment\(row\)/)
 assert.match(section,/payment\.status!=='PENDING'/)
 assert.match(section,/\/pixQrCode/)
 assert.match(section,/financialWritesPerformed:false/)
 assert.doesNotMatch(section,/processor\([^\n]*,'POST'/)
 assert.doesNotMatch(section,/db\.query\(/)
 assert.match(source,/action==='get_qr'\?await getPendingQr\(db\)/)
})

test('pending QR refuses expired and oversized/invalid payment materials',()=>{
 const section=source.split('async function getPendingQr(db){')[1]?.split('async function confirm(db){')[0]||''
 assert.match(section,/qr\.payload\.length>4096/)
 assert.match(section,/qr\.encodedImage\.length>200000/)
 assert.match(section,/Date\.parse\(qr\.expirationDate\)/)
 assert.match(section,/expires<=Date\.now\(\)/)
 assert.match(section,/existing_qr_expired_requires_reconciliation/)
 assert.doesNotMatch(section,/processor\([^\n]*,'POST'/)
})

test('durable authenticated webhook is reconciled with Asaas inside TEST transaction',()=>{
 const section=source.split('async function processWebhookEvent(db,eventId){')[1]?.split('async function getPendingQr(db){')[0]||''
 assert.ok(section.length>500)
 assert.match(section,/await db\.query\('BEGIN'\)/)
 assert.match(section,/for update/)
 assert.match(section,/event\.status==='processed'/)
 assert.match(section,/row\.asaas_payment_id!==event\.processor_payment_id/)
 assert.match(section,/await getVerifiedPayment\(row\)/)
 assert.match(section,/PAYMENT_RECEIVED/)
 assert.match(section,/payment\.status!=='RECEIVED'/)
 assert.match(section,/await sync\(db,row,payment\)/)
 assert.match(section,/set status='processed',processed_at=now\(\)/)
 assert.match(section,/await db\.query\('COMMIT'\)/)
 assert.match(section,/await db\.query\('ROLLBACK'\)/)
 assert.match(section,/splitSettled:false,providerPaid:false/)
 assert.doesNotMatch(section,/processor\([^\n]*,'POST'/)
 assert.match(source,/action==='process_webhook'\?await processWebhookEvent\(db,req\.body\?\.eventId\)/)
})
