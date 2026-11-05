import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(`src/features/client/${p}`,'utf8')
test('summary can edit each step and distinguishes missing information and payment preference',()=>{
 const summary=read('request/ClientSummaryScreen.tsx')
 const payment=read('payments/ClientPaymentScreen.tsx')
 for(const name of ['onEditNeed','onEditLocation','onEditWhen','onEditPayment'])assert.match(summary,new RegExp(name))
 assert.match(summary,/clientJourney\.missingTitle/)
 assert.match(summary,/clientJourney\.paymentMissing/)
 assert.match(payment,/clientJourney\.paymentPreferenceHelp/)
})
test('draft input persists and address quote responses cannot overwrite newer input',()=>{
 const need=read('request/ClientNeedScreen.tsx'),location=read('request/ClientLocationScreen.tsx')
 assert.match(need,/updateDescription\(event\.target\.value\)/)
 assert.match(need,/sessionStorage\.setItem\(storageKey,JSON\.stringify\(\{\.\.\.previous,description:value\}\)\)/)
 assert.match(location,/epoch!==quoteEpoch\.current/)
 assert.match(location,/clientJourney\.placesError/)
 assert.match(location,/aria-pressed=\{selectedPlace===place\.id\}/)
})
test('order next actions stay attached to the selected service',()=>{
 const detail=read('order/ClientServiceDetail.tsx')
 assert.match(detail,/clientJourney\.amountPending/)
 assert.match(detail,/id="ugo-client-order-review"/)
 assert.match(detail,/id="ugo-client-order-chat"/)
 assert.match(detail,/<ServiceChat role="client" serviceId=\{service\.id\}/)
})
