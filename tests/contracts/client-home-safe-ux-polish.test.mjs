import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const home=fs.readFileSync('src/features/client/home/ClientHomeScreen.tsx','utf8')
const css=fs.readFileSync('src/features/client/ui/clientHomeScreen.css','utf8')

test('client home preserves existing service, matching, notification and map wiring',()=>{
 assert.match(home,/retryOwnedClientMatching/)
 assert.match(home,/refreshProviderRadar/)
 assert.match(home,/NotificationCenter|ugo-notification-center/)
 assert.match(home,/navigator\.geolocation\.getCurrentPosition/)
 assert.match(home,/flow\.navigate\('request'\)/)
})

test('client home exposes non-invasive location and activity status',()=>{
 assert.match(home,/type GeoPermission=/)
 assert.match(home,/permissions\.query\(\{name:'geolocation'\}\)/)
 assert.match(home,/ugo-home-trust-strip/)
 assert.match(home,/Ubicación activa/)
 assert.match(home,/Ubicación bloqueada/)
 assert.match(home,/pedidos activos/)
 assert.match(home,/aria-label="Notificaciones">🔔/)
})

test('client home status polish is additive and responsive',()=>{
 assert.match(css,/\.ugo-home-trust-strip/)
 assert.match(css,/\.ugo-home-trust-strip>span\.is-ok/)
 assert.match(css,/\.ugo-home-trust-strip>span\.is-warning/)
 assert.match(css,/@media\(max-width:480px\).*ugo-home-trust-strip/s)
})
