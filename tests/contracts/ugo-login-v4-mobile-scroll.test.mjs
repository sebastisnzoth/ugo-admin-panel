import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const css=readFileSync(new URL('../../src/mvp/ugo-login-v3.css',import.meta.url),'utf8')
test('mobile login pages release document scroll and allow vertical touch panning',()=>{
 assert.match(css,/html:has\(\.mvp-auth-page\)/)
 assert.match(css,/overflow-y:visible!important/)
 assert.match(css,/touch-action:pan-y!important/)
 assert.match(css,/max-height:none!important/)
 assert.match(css,/height:auto!important/)
})
test('client, provider, admin and landscape keep auto-height login shells',()=>{
 for(const key of ['role-client .mvp-auth-shell','role-provider .mvp-auth-shell','ugo-admin-auth .ugo-admin-auth-shell','orientation:landscape']){
 assert.ok(css.includes(key),key)
 }
})
