import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('landing provides honest client and provider entry points without a nonfunctional search',()=>{
 const landing=readFileSync('src/mvp/UgoLanding.tsx','utf8')
 assert.match(landing,/goRole\('client'\)/)
 assert.match(landing,/goRole\('provider'\)/)
 assert.doesNotMatch(landing,/ugo_landing_service_intent|ugo-reference-search/)
 assert.match(landing,/landing\.availabilityNote/)
 assert.match(landing,/t\(title\)/)
 assert.match(landing,/landing\.directHeadline/)
 assert.match(landing,/<article key=\{title\} className=\{"ugo-service-card/)
 assert.match(landing,/landing\.trustDocumentsCopy/)
 assert.match(landing,/landing\.trustPriceCopy/)
})
