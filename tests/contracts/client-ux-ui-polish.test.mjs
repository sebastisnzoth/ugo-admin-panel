import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const home=fs.readFileSync('src/features/client/home/ClientHomeScreen.tsx','utf8')
const homeCss=fs.readFileSync('src/features/client/ui/clientHomeScreen.css','utf8')
const needCss=fs.readFileSync('src/features/client/request/clientNeedScreen.css','utf8')
const locationCss=fs.readFileSync('src/features/client/request/clientLocationScreen.css','utf8')

test('client UX polish preserves critical home behavior',()=>{
 assert.match(home,/retryOwnedClientMatching/)
 assert.match(home,/refreshProviderRadar/)
 assert.match(home,/navigator\.geolocation\.getCurrentPosition/)
 assert.match(home,/flow\.navigate\('request'\)/)
 assert.match(home,/ugo-notification-center\.role-client/)
})

test('client home exposes clearer hierarchy without replacing flows',()=>{
 assert.match(home,/ugo-home-status-row/)
 assert.match(home,/ugo-home-section-eyebrow/)
 assert.match(home,/ugo-home-cta-icon/)
 assert.match(home,/Ubicación activa/)
 assert.match(home,/Revisar ubicación/)
 assert.match(homeCss,/Client UX\/UI polish/)
 assert.match(homeCss,/focus-within/)
})

test('request and location polish stays CSS-only and mobile-first',()=>{
 assert.match(needCss,/Client request UX polish/)
 assert.match(needCss,/@media\(max-width:699px\)/)
 assert.match(locationCss,/Client location UX polish/)
 assert.match(locationCss,/ugo-location-saved-list/)
 assert.match(locationCss,/@media\(max-width:699px\)/)
})
