import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const offer=readFileSync('src/mvp/provider/ProviderOpportunities.tsx','utf8')
const job=readFileSync('src/mvp/provider/ProviderActiveJob.tsx','utf8')
const earnings=readFileSync('src/mvp/provider/ProviderEarnings.tsx','utf8')
test('offers do not invent a countdown or value when data is missing',()=>{
 assert.match(offer,/hasExpiry=Number\.isFinite\(expiry\)/)
 assert.match(offer,/providerOpportunity\.deadlineUnknown/)
 assert.match(offer,/item\.estimatedValue>0\?.*providerJob\.amountPending/)
 assert.match(offer,/!d\.matchingReady\?t\('providerHome\.gpsHelp'\)/)
})
test('net earnings are not substituted with the gross service tariff',()=>{
 assert.match(job,/s\.ganancia_proveedor!=null\?formatMoney\(s\.ganancia_proveedor/)
 assert.doesNotMatch(job,/ganancia_proveedor\|\|s\.tarifa/)
 assert.ok(earnings.indexOf('{message&&')<earnings.indexOf('{pix&&'))
})
