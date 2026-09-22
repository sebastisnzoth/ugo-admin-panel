import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const payment=fs.readFileSync(new URL('../../src/features/client/payments/ClientPaymentChoice.tsx',import.meta.url),'utf8')

test('payment state load failures are visible to Sentinel only while foreground and online',()=>{
 assert.match(payment,/const shouldEscalatePaymentSync=\(\)=>document\.visibilityState==='visible'&&navigator\.onLine/)
 assert.match(payment,/client_payment_state_sync_error/)
 assert.match(payment,/action:'client\.order\.payment\.sync'/)
 assert.match(payment,/severity:'P1'/)
})

test('payment realtime transport failures resync and report non-readiness telemetry',()=>{
 assert.match(payment,/status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'/)
 assert.match(payment,/client_payment_realtime_sync_error/)
 assert.match(payment,/reportPaymentSyncFailure/)
 assert.doesNotMatch(payment,/client_payment_realtime_sync_error[\s\S]{0,180}checklistCode:'PAYMENT-CLOSE'/)
})

test('confirmed payment mutation failure remains the only P0 PAYMENT-CLOSE path',()=>{
 assert.match(payment,/confirmed\?'P0':'P1'/)
 assert.match(payment,/confirmed\?'client\.order\.payment':'client\.order\.payment\.recovery'/)
 assert.match(payment,/checklistCode:confirmed\?'PAYMENT-CLOSE':undefined/)
})
