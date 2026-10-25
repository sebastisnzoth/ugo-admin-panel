import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clientNotificationsReadinessMode} from '../../scripts/lib/clientNotificationsReadinessMode.mjs'

const lock=JSON.parse(readFileSync(new URL('../../docs/ugo-work-locks/readiness-client-notifications.json',import.meta.url),'utf8'))
const runtime=readFileSync(new URL('../../scripts/client-notifications-runtime.mjs',import.meta.url),'utf8')
const workflow=readFileSync(new URL('../../.github/workflows/client-notifications-runtime.yml',import.meta.url),'utf8')

test('completed client notifications lock allows full regression but no historical lock mutation',()=>{
 assert.equal(lock.status,'DONE')
 assert.equal(clientNotificationsReadinessMode(lock),'DONE')
 assert.match(runtime,/readinessMode=clientNotificationsReadinessMode\(workLock\)/)
 assert.match(runtime,/readiness_mode:readinessMode/)
 assert.match(workflow,/if: github\.event_name != 'pull_request' && env\.UGO_CLIENT_NOTIFICATIONS_LOCK_STATUS == 'IN_PROGRESS'/)
 assert.match(workflow,/clientNotificationsReadinessMode\(lock\)/)
 assert.match(workflow,/node scripts\/client-notifications-runtime\.mjs/)
 assert.match(workflow,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/UGO_TARGET_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/node scripts\/client-notifications-judge\.mjs/)
 assert.match(workflow,/node scripts\/client-notifications-sentinel\.mjs/)
 assert.match(workflow,/LOCK_OWNERSHIP_CHANGED/)
 assert.doesNotMatch(runtime,/assert\.equal\(workLock\.status,'IN_PROGRESS'\)/)
})

test('active readiness needs live lease; stale/unknown lock fails closed',()=>{
 const valid={...lock,status:'IN_PROGRESS',lease_expires_at:new Date(Date.now()+60_000).toISOString()}
 assert.equal(clientNotificationsReadinessMode(valid),'IN_PROGRESS')
 assert.throws(()=>clientNotificationsReadinessMode({...valid,lease_expires_at:new Date(Date.now()-60_000).toISOString()}),/ACTIVE_LEASE_REQUIRED/)
 assert.throws(()=>clientNotificationsReadinessMode({...valid,lease_expires_at:null}),/ACTIVE_LEASE_REQUIRED/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,status:'BLOCKED'}),/CLIENT_NOTIFICATIONS_LOCK_STATUS_BLOCKED/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,readiness_id:'wrong'}),/CLIENT_NOTIFICATIONS_LOCK_IDENTITY_INVALID/)
})

test('DONE cannot pass with revoked or unverified evidence',()=>{
 assert.throws(()=>clientNotificationsReadinessMode({...lock,judge:'FAIL'}),/COMPLETED_READINESS_EVIDENCE_INVALID/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,lease_expires_at:new Date().toISOString()}),/COMPLETED_READINESS_EVIDENCE_INVALID/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,production_touched:true}),/COMPLETED_READINESS_EVIDENCE_INVALID/)
})

const judge=readFileSync(new URL('../../scripts/client-notifications-judge.mjs',import.meta.url),'utf8')
const sentinel=readFileSync(new URL('../../scripts/client-notifications-sentinel.mjs',import.meta.url),'utf8')
const tracking=readFileSync(new URL('../../src/features/client/order/ClientLiveTracking.tsx',import.meta.url),'utf8')
const followup=readFileSync(new URL('../../src/i18n/translations/followup.ts',import.meta.url),'utf8')

test('client notification E2E, Judge and Sentinel use current Spanish timeline without weakening state checks',()=>{
 const expected="['Asignado','Aceptado','En camino','En el lugar','En curso','Finalizado']"
 assert.ok(runtime.includes(expected),'browser E2E must check every exact visible label')
 assert.ok(judge.includes(expected),'independent Judge must validate the same six labels')
 assert.match(sentinel,/for\(const step of proof\.sequence\)assert\.deepEqual\(step\.labels,timelineLabels/)
 assert.match(runtime,/assert\.equal\(persisted,state/)
 assert.match(judge,/assert\.equal\(step\.backend_state,step\.state\)/)
 assert.match(sentinel,/assert\.equal\(proof\.cleanup_ok,true\)/)
 assert.match(tracking,/t\('clientTracking\.'\+step\.key\)/)
 const es=followup.split('Object.assign(followupMessages["es"],{')[1]?.split('Object.assign(followupMessages["en"],{')[0]
 assert.ok(es,'Spanish translation catalog required')
 for(const [key,label] of [['assigned','Asignado'],['accepted','Aceptado'],['route','En camino'],['arrived','En el lugar'],['working','En curso'],['finished','Finalizado']]){
  assert.ok(tracking.includes("{key:'"+key+"'}"),'missing tracking stage '+key)
  assert.ok(es.includes('"clientTracking.'+key+'": "'+label+'"'),'mismatched translation '+key)
 }
})

const statusRuntime=readFileSync(new URL('../../scripts/client-status-runtime.mjs',import.meta.url),'utf8')
const statusJudge=readFileSync(new URL('../../scripts/client-status-judge.mjs',import.meta.url),'utf8')
const statusSentinel=readFileSync(new URL('../../scripts/client-status-sentinel.mjs',import.meta.url),'utf8')

test('status lifecycle regression checks the same six localized labels and independently validates proof',()=>{
 const expected="['Asignado','Aceptado','En camino','En el lugar','En curso','Finalizado']"
 assert.ok(statusRuntime.includes(expected))
 assert.ok(statusJudge.includes(expected))
 assert.match(statusSentinel,/for\(const step of proof\.sequence\)assert\.deepEqual\(step\.labels,timelineLabels/)
 assert.match(statusSentinel,/assert\.equal\(proof\.cleanup_ok,true\)/)
 assert.match(statusSentinel,/assert\.match\(tracking,\/t/)
})

test('notifications E2E never duplicates a cash payment auto-materialized by the assignment trigger',()=>{
 assert.match(runtime,/\.select\('metadata,ambiente'\)\.eq\('id',fixture\.id\)\.single\(\)/)
 assert.match(runtime,/const requestedMethod=String\(paymentContext\?\.metadata\?\.requested_payment_method/)
 assert.match(runtime,/if\(requestedMethod==='efectivo'\)/)
 assert.match(runtime,/assert\.ok\(existingPayment\?\.id,'AUTO_CASH_PAYMENT_REQUIRED'\)/)
 assert.match(runtime,/assert\.equal\(existingPayment\.procesador,'efectivo'/)
 assert.match(runtime,/assert\.equal\(existingPayment\.modelo_pago,'presencial'/)
 assert.match(runtime,/assert\.equal\(existingPayment,null,'UNEXPECTED_PREEXISTING_PIX_PAYMENT'\)/)
 assert.match(runtime,/assert\.equal\(selectedPayment\.metodo,requestedMethod,'TEST_PAYMENT_PREFERENCE_MISMATCH'\)/)
 assert.match(runtime,/let verifiedPayment=null/)
 assert.match(runtime,/verifiedPayment=\{method:selectedPayment\.metodo,state:selectedPayment\.estado,environment:selectedPayment\.ambiente/)
 assert.match(runtime,/payment:verifiedPayment/)
 assert.doesNotMatch(runtime,/payment:\{method:'pix',state:'retenido',environment:'demo'\}/)
})

test('client live notice compares the localized banner title rather than raw database title',()=>{
 const locale=readFileSync(new URL('../../src/i18n/locale.tsx',import.meta.url),'utf8')
 assert.match(locale,/"notification\.proveedor_llego":"Llegó tu profesional"/)
 assert.match(runtime,/const displayedTitle=notice=>spanishMessages\['notification\.'\+notice\.tipo\]\|\|notice\.titulo/)
 assert.match(runtime,/banner\.getByText\(displayedTitle\(notice\),\{exact:true\}\)/)
 assert.match(runtime,/persisted_title:notice\.titulo/)
 assert.doesNotMatch(runtime,/banner\.getByText\(notice\.titulo,\{exact:true\}\)/)
})


test('cash work approval cannot be misreported as completion before client confirms payment',()=>{
 assert.match(runtime,/if\(requestedMethod==='efectivo'\)/)
 assert.match(runtime,/assert\.equal\(approved\?\.estado,'esperando_aprobacion','CASH_WORK_APPROVAL_MUST_AWAIT_PAYMENT'\)/)
 assert.match(runtime,/assert\.ok\(approved\?\.metadata\?\.trabajo_aprobado_at,'CASH_WORK_APPROVAL_MUST_PERSIST'\)/)
 assert.match(runtime,/auth\.rpc\('confirmar_pago_efectivo_cliente',\{p_servicio_id:fixture\.id\}\)/)
 assert.match(runtime,/assert\.equal\(approved\?\.estado,'completado','PROTECTED_PIX_APPROVAL_MUST_COMPLETE_SERVICE'\)/)
 assert.match(runtime,/assert\.equal\(completed\?\.estado,'completado','CLIENT_APPROVAL_AND_PAYMENT_MUST_COMPLETE_SERVICE'\)/)
 assert.match(runtime,/\.eq\('id',selectedPayment\.id\)\.single\(\)/)
 assert.match(runtime,/assert\.equal\(finalPayment\?\.estado,'liberado','COMPLETED_SERVICE_PAYMENT_MUST_BE_RELEASED'\)/)
 assert.match(runtime,/completado:completionSource/)
 assert.match(judge,/proof\.payment\?\.final_state,'liberado'/)
 assert.match(judge,/proof\.transition_sources\?\.completado/)
 assert.match(judge,/client\.aprobar_servicio\+client\.confirmar_pago_efectivo_cliente/)
 assert.match(runtime,/await expectUi\('completado','finished'\)/)
 assert.doesNotMatch(runtime,/assert\.equal\(approved\?\.estado,'completado','CLIENT_APPROVAL_MUST_COMPLETE_SERVICE'\)/)
})

// Keep the real TEST browser gate coupled to every file that can change its
// assertions or authentication retries. A Judge-only commit must not be green
// merely because the workflow never ran.
test('Client Notifications CI runs when runtime, Judge, Sentinel or auth helper changes',()=>{
 const pr=workflow.split('\n  pull_request:\n')[1]?.split('\n  push:\n')[0]
 const push=workflow.split('\n  push:\n')[1]?.split('\nconcurrency:\n')[0]
 assert.ok(pr&&push,'both PR and main triggers are required')
 const watched=[
  'scripts/client-notifications-runtime.mjs',
  'scripts/client-notifications-judge.mjs',
  'scripts/client-notifications-sentinel.mjs',
  'scripts/lib/clientNotificationsReadinessMode.mjs',
  'scripts/lib/testAuthRetry.mjs',
  'scripts/lib/waitForClientProfileUi.mjs',
  'tests/contracts/client-notifications-profile-ui-recovery.test.mjs',
  'tests/contracts/client-notifications-done-regression-gate-20261023.test.mjs',
  'tests/contracts/client-notifications-transient-test-auth-20261023.test.mjs',
  'tests/contracts/client-notifications-readiness.test.mjs',
  'scripts/client-status-runtime.mjs',
  'scripts/client-status-judge.mjs',
  'scripts/client-status-sentinel.mjs',
  'src/features/client/order/ClientLiveTracking.tsx',
  'src/i18n/locale.tsx',
  'src/i18n/translations/followup.ts',
  '.github/workflows/client-notifications-runtime.yml',
 ]
 for(const [event,block] of [['pull_request',pr],['push',push]]){
  for(const file of watched)assert.ok(block.includes("- '"+file+"'"),event+' must watch '+file)
 }
})


test('notifications fixture establishes client pickup and fresh authenticated provider GPS before assignment',()=>{
 assert.match(runtime,/auth\.rpc\('guardar_ubicacion_servicio_cliente',\{p_servicio_id:fixture\.id,p_lat:TEST_LAT,p_lng:TEST_LNG\}\)/)
 assert.match(runtime,/provider\.rpc\('activar_disponibilidad_proveedor',\{p_lat:TEST_LAT,p_lng:TEST_LNG,p_captured_at:new Date\(\)\.toISOString\(\),p_accuracy_m:10\}\)/)
 assert.ok(runtime.indexOf("provider.rpc('activar_disponibilidad_proveedor'")<runtime.indexOf(".update({proveedor_id:TEST_PROVIDER_ID,estado:'asignado'})"),'provider must publish trusted GPS before assignment')
 assert.match(runtime,/assert\.ifError\(onlineError\)/)
 assert.match(runtime,/assert\.ifError\(pickupError\)/)
 assert.doesNotMatch(runtime,/\.update\(\{proveedor_id:TEST_PROVIDER_ID,estado:'asignado',.*ubicacion/)
})
