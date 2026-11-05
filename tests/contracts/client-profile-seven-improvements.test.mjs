import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const profile=readFileSync('src/features/client/profile/ClientProfilePanel.tsx','utf8')
const css=readFileSync('src/features/client/profile/clientProfilePanel.css','utf8')
const calendar=readFileSync('src/mvp/UserGoogleCalendarConnect.tsx','utf8')
test('profile communicates place, security, payment and integration states',()=>{
 assert.match(profile,/clientProfileUx\.locationPendingHelp/)
 assert.match(profile,/<label><span>\{t\('clientProfile\.placeName'\)\}<\/span><input/)
 assert.match(profile,/confirm\(\{title:t\('clientProfile\.deleteTitle'\)/)
 assert.match(profile,/id="ugo-password-help"/)
 assert.match(profile,/aria-pressed=\{paymentMethod==='pix'\}/)
 assert.match(profile,/clientProfileUx\.paymentHelp/)
 assert.match(calendar,/client requests are not automatically synchronized/i)
 assert.match(calendar,/statusError\?<.*role="alert"/)
 assert.match(calendar,/disconnectProviderCalendar\(accessToken\)/)
 assert.match(css,/ugo-client-place-new label\{display:grid/)
 assert.match(css,/@media\(max-width:650px\)/)
 assert.match(css,/:focus-visible/)
})
