import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('notification runtime opens the live offer before retiring its banner',()=>{
 const source=readFileSync('scripts/provider-notifications-runtime.mjs','utf8')
 const live=source.indexOf("await page.locator('.ugo-notification-live.is-provider-call').waitFor")
 const click=source.indexOf("await page.locator('.ugo-notification-live.is-provider-call').click()",live)
 const detail=source.indexOf("await page.locator('.provider-opportunity-detail .provider-main-action').waitFor",click)
 const read=source.indexOf("const markOfferRead=await admin.from('notificaciones').update",detail)
 assert.ok(live>=0&&click>live&&detail>click&&read>detail,'OFFER_CLICK_BEFORE_READ_REQUIRED')
 assert.match(source,/if\(markOfferRead\.error\)throw markOfferRead\.error/)
})
