import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const home=fs.readFileSync('src/features/client/home/ClientHomeScreen.tsx','utf8')
const homeCss=fs.readFileSync('src/features/client/ui/clientHomeScreen.css','utf8')
const headerCss=fs.readFileSync('src/features/client/ui/clientPersistentHeader.css','utf8')
const needCss=fs.readFileSync('src/features/client/request/clientNeedScreen.css','utf8')
const locationCss=fs.readFileSync('src/features/client/request/clientLocationScreen.css','utf8')

test('client redesign preserves critical functional wiring',()=>{
 assert.match(home,/retryOwnedClientMatching/)
 assert.match(home,/refreshProviderRadar/)
 assert.match(home,/subscribeProviderRadar/)
 assert.match(home,/navigator\.geolocation\.getCurrentPosition/)
 assert.match(home,/ugo-notification-center\.role-client/)
 assert.match(home,/flow\.navigate\('request'\)/)
 assert.match(home,/flow\.navigate\('history'\)/)
 assert.match(home,/flow\.navigate\('profile'\)/)
})

test('client redesign separates primary experience areas',()=>{
 assert.match(home,/ugo-client-redesign-v2/)
 assert.match(home,/ugo-home-primary-cta/)
 assert.match(home,/ugo-home-active-panel/)
 assert.match(home,/ugo-home-services/)
 assert.match(home,/ugo-home-map-card/)
 assert.match(home,/ugo-home-mobile-nav/)
})

test('redesign stays scoped and mobile-first',()=>{
 assert.match(homeCss,/UGO CLIENT REDESIGN V2/)
 assert.match(homeCss,/\.ugo-client-root \.ugo-client-redesign-v2/)
 assert.match(homeCss,/@media\(max-width:699px\)/)
 assert.match(homeCss,/grid-template-areas:"hero" "active" "services" "map"/)
 assert.match(headerCss,/Client redesign v2 header lock/)
 assert.match(needCss,/Client redesign v2 request step/)
 assert.match(locationCss,/Client redesign v2 location step/)
})

test('request and location business components are not replaced by redesign',()=>{
 const need=fs.readFileSync('src/features/client/request/ClientNeedScreen.tsx','utf8')
 const location=fs.readFileSync('src/features/client/request/ClientLocationScreen.tsx','utf8')
 assert.match(need,/ClientRequestEvidence/)
 assert.match(need,/saveNeed/)
 assert.match(need,/setStage\('location'\)/)
 assert.match(location,/cotizar_tarifa_servicio/)
 assert.match(location,/geocodeClientAddress/)
 assert.match(location,/navigator\.geolocation/)
 assert.match(location,/setStage\('when'\)/)
})
