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
 assert.match(activity,/ACTIVOS AHORA/)
 assert.match(activity,/PRÓXIMOS/)
 assert.match(activity,/FINALIZADOS/)
 assert.match(activity,/currentCount/)
 assert.match(activity,/upcomingCount/)
 assert.match(activity,/finalCount/)
 assert.match(styles,/\.ugo-client-activity-summary/)
})

test('client Activity has one state-navigation surface instead of duplicate filter rows',()=>{
 assert.match(activity,/ugo-client-history-toolbar/)
 assert.match(activity,/Todos <b>\{rows\.length\}<\/b>/)
 assert.doesNotMatch(activity,/>En curso <b>\{currentCount\}<\/b>/)
 assert.doesNotMatch(activity,/>Próximos <b>\{upcomingCount\}<\/b>/)
 assert.doesNotMatch(activity,/>Finalizados <b>\{finalCount\}<\/b>/)
})

test('every client order exposes an operational state before secondary metadata',()=>{
 assert.match(activity,/ESTADO DEL PEDIDO/)
 assert.match(activity,/Profesional en camino/)
 assert.match(activity,/Esperando respuesta/)
 assert.match(activity,/Esperando tu aprobación/)
 assert.match(activity,/ugo-history-state-focus/)
 assert.match(styles,/\.ugo-history-state-focus\.tone-live/)
 assert.match(styles,/\.ugo-history-state-focus\.tone-waiting/)
})

test('opening the exact order and chat stays the primary Activity action',()=>{
 assert.match(activity,/Abrir pedido y chat/)
 assert.match(activity,/onOpenService\(r\.id\)/)
 assert.match(activity,/Cancelar pedido/)
 assert.match(styles,/\.ugo-history-open-button/)
})
