import './i18n-test-compat.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const activity=fs.readFileSync('src/mvp/ServiceHistoryPanel.tsx','utf8')
const styles=fs.readFileSync('src/mvp/service-history.css','utf8')

test('client Activity loads the stylesheet that defines its real runtime surface',()=>{
 assert.match(activity,/import'\.\/service-history\.css'/)
 assert.match(activity,/import'\.\/provider-history\.css'/)
 assert.match(styles,/\.ugo-client-activity-summary/)
 assert.match(styles,/\.ugo-client-screen-overlay \.ugo-client-history/)
})

test('client Activity separates current upcoming and finished work at a glance',()=>{
 assert.match(activity,/history\.active/)
 assert.match(activity,/history\.upcoming/)
 assert.match(activity,/history\.finished/)
 assert.match(activity,/currentCount/)
 assert.match(activity,/upcomingCount/)
 assert.match(activity,/finalCount/)
 assert.match(styles,/\.ugo-client-activity-summary/)
})

test('client Activity has one state-navigation surface instead of duplicate filter rows',()=>{
 assert.match(activity,/ugo-client-history-toolbar/)
 assert.match(activity,/t\('history\.all'\)\} <b>\{rows\.length\}<\/b>/)
 assert.doesNotMatch(activity,/>En curso <b>\{currentCount\}<\/b>/)
 assert.doesNotMatch(activity,/>Próximos <b>\{upcomingCount\}<\/b>/)
 assert.doesNotMatch(activity,/>Finalizados <b>\{finalCount\}<\/b>/)
})

test('every client order exposes an operational state before secondary metadata',()=>{
 assert.match(activity,/history\.orderState/)
 assert.match(activity,/STATUS_KEYS:[\s\S]*en_camino:'en_camino'/)
 assert.match(activity,/STATUS_KEYS:[\s\S]*ofrecido:'ofrecido'/)
 assert.match(activity,/STATUS_KEYS:[\s\S]*esperando_aprobacion:'esperando_aprobacion'/)
 assert.match(activity,/ugo-history-state-focus/)
 assert.match(styles,/\.ugo-history-state-focus\.tone-live/)
 assert.match(styles,/\.ugo-history-state-focus\.tone-waiting/)
})

test('opening the exact order and chat stays the primary Activity action',()=>{
 assert.match(activity,/history\.openOrder/)
 assert.match(activity,/onOpenService\(r\.id\)/)
 assert.match(activity,/clientMatch\.cancelTitle/)
 assert.match(styles,/\.ugo-history-open-button/)
})

test('Activity cancellation shares the canonical client action service',()=>{
 assert.match(activity,/cancelOwnedClientService/)
 assert.match(activity,/CLIENT_CANCELLABLE_SERVICE_STATES/)
 assert.doesNotMatch(activity,/getDispatchProvider/)
 assert.match(activity,/t\('clientOrder\.cancelFailed'\)|t\('clientMatch\.cancelFailed'\)/)
})

test('client Activity groups Todos into activos, próximos y finalizados with operational priority',()=>{
 assert.match(activity,/ugo-history-section-head/)
 assert.match(activity,/ugo-history-section-tag/)
 assert.match(activity,/CLIENT_PRIORITY/)
 assert.match(activity,/sectionOf/)
 assert.match(activity,/showSections/)
 assert.match(activity,/esperando_aprobacion:0/)
 assert.match(activity,/disputado:1/)
 assert.match(activity,/Requiere tu acción/)
 assert.match(styles,/\.ugo-history-section-head\.tone-live/)
 assert.match(styles,/\.ugo-history-section-head\.tone-waiting/)
 assert.match(styles,/\.ugo-history-section-head\.tone-done/)
 assert.match(styles,/\.ugo-history-section-tag\.tone-live/)
 assert.match(styles,/\.ugo-history-state-action/)
})
