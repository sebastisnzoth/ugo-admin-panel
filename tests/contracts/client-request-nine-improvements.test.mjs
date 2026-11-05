import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(`src/features/client/${p}`,'utf8')
test('request journey communicates progress, guidance, price and review',()=>{
 const screens=['request/ClientNeedScreen.tsx','request/ClientLocationScreen.tsx','request/ClientWhenScreen.tsx','payments/ClientPaymentScreen.tsx','request/ClientSummaryScreen.tsx'].map(read)
 for(const [index,step] of [[0,1],[2,2],[4,3]]){assert.match(screens[index],new RegExp(`aria-valuenow=\\{${step}\\}`));assert.match(screens[index],/aria-valuemax=\{3\}/)}
 assert.match(screens[1],/locationContent=/)
 assert.match(screens[3],/paymentControls=\{controls\}/)
 assert.match(screens[0],/clientJourney\.descriptionHint/)
 assert.match(screens[1],/clientJourney\.mapDisclaimer/)
 assert.match(screens[2],/clientJourney\.availabilityHint/)
 assert.match(screens[2],/persistTiming/)
 assert.match(screens[3],/clientJourney\.paymentPreferenceHelp/)
 assert.match(screens[4],/clientJourney\.pricePending/)
 for(const callback of ['onEditNeed','onEditLocation','onEditWhen','onEditPayment'])assert.ok(screens[4].includes(callback))
})
test('uncertain submission can be retried with the same draft identity',()=>{
 const post=read('request/ClientPostConfirmFlow.tsx')
 assert.match(post,/if\(!service\)return/)
 assert.match(post,/onClick=\{\(\)=>void create\(\)\}/)
 assert.match(post,/findByDraft\(requestDraftId\)/)
 assert.match(post,/creating\.current/)
 assert.match(post,/clientJourney\.matchingHelp/)
 assert.match(read('request/clientJourneyUnified.css'),/prefers-reduced-motion/)
})
