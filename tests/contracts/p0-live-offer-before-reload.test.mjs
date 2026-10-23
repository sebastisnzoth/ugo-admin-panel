import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const e2e = read('scripts/p0-client-provider-e2e.mjs')
const notifications = read('src/mvp/NotificationCenter.tsx')
const workflow = read('.github/workflows/p0-client-provider-e2e.yml')

test('offer popup exposes the exact authenticated offer and service IDs for E2E matching proof', () => {
 assert.match(notifications, /data-ugo-offer-id=\{role==='provider'&&liveNotice\.tipo==='nueva_oferta'/)
 assert.match(notifications, /data-ugo-service-id=\{role==='provider'&&liveNotice\.tipo==='nueva_oferta'/)
})

test('E2E arms the foreground alert probe before creating the order and verifies the matching offer ID', () => {
 const arm=e2e.lastIndexOf('await armProviderLiveOfferProbe(ui.page)')
 const insert=e2e.lastIndexOf("client.from('servicios').insert")
 const verify=e2e.lastIndexOf('await assertProviderLiveOffer(ui,offerId,serviceId)')
 const accept=e2e.lastIndexOf('await acceptOfferInUi(ui)')
 assert.ok(arm>=0 && insert>arm && verify>insert && accept>verify,
  'live offer probe must be armed before request creation, checked before UI acceptance')
 assert.match(e2e,/\.ugo-notification-live\.is-provider-call/)
 assert.match(e2e,/signal\.offerId===offerId&&signal\.serviceId===serviceId/)
})

test('E2E never refreshes the provider UI to make a new offer appear', () => {
 const start=e2e.indexOf('async function acceptOfferInUi(ui)')
 const end=e2e.indexOf('\ntry{',start)
 assert.ok(start>=0&&end>start,'acceptOfferInUi function required')
 assert.doesNotMatch(e2e.slice(start,end), /page\.reload\(/,
  'provider must see and accept the offer on the existing live page')
})

test('E2E browser runner uses the supported pinned Ubuntu image for Playwright 1.56.1', () => {
 assert.match(workflow,/runs-on:\s*ubuntu-24\.04/)
 assert.match(workflow,/playwright@1\.56\.1/)
})
