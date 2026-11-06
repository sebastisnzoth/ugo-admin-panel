import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const profile=readFileSync('src/features/client/profile/ClientProfilePanel.tsx','utf8')
const css=readFileSync('src/features/client/profile/clientProfilePanel.css','utf8')
test('client profile keeps security fields and optional calendar in clear sections',()=>{
 assert.match(css,/profile-sections\{align-items:start!important\}/)
 assert.match(css,/profile-security form label\{display:grid!important/)
 assert.match(css,/profile-security form input\{width:100%!important/)
 assert.match(css,/client-place-new\{grid-template-columns:minmax\(0,1fr\)/)
 assert.match(profile,/ugo-client-profile-integrations.*<details>/)
 assert.match(profile,/UserGoogleCalendarConnect accessToken=\{session\.access_token\} client/)
})
