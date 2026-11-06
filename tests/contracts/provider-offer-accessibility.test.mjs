import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const offers=readFileSync('src/mvp/provider/ProviderOpportunities.tsx','utf8')
test('countdown refreshes on returning to the app and rechecks expiry on actions',()=>{
 assert.match(offers,/document\.addEventListener\('visibilitychange',sync\)/)
 assert.match(offers,/window\.removeEventListener\('focus',sync\)/)
 assert.equal((offers.match(/hasExpiry&&Date\.now\(\)>=expiry/g)||[]).length,2)
})
test('screen readers are notified of expiration without announcing every second',()=>{
 assert.match(offers,/role="status" aria-live="polite">\{expired\?/)
 assert.doesNotMatch(offers,/provider-offer-countdown" aria-live/)
 assert.match(offers,/aria-label=\{t\('providerOpportunity\.title'\)\}/)
})
