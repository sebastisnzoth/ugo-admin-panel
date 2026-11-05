import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const screen=readFileSync('src/features/client/request/ClientLocationScreen.tsx','utf8')
const css=readFileSync('src/features/client/request/clientLocationScreen.css','utf8')
test('location status is not a simulated interactive map and retains the GPS action',()=>{
 assert.doesNotMatch(screen,/ugo-location-map-grid|ugo-location-pin/)
 assert.match(screen,/clientJourney\.mapDisclaimer/)
 assert.match(screen,/role="status" aria-live="polite"/)
 assert.match(screen,/onClick=\{useLocation\}/)
 assert.match(screen,/aria-pressed=\{selectedPlace===place\.id\}/)
 assert.match(css,/ugo-location-map-status\{position:static/)
 assert.match(css,/ugo-location-map button\{position:static/)
 assert.match(css,/@media\(max-width:370px\)/)
})
