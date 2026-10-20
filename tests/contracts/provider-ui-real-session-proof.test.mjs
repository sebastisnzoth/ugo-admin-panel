import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const runtime=readFileSync(new URL('../../scripts/provider-ui-runtime.mjs',import.meta.url),'utf8')

test('Provider Playwright proof uses real UI auth and never injects a browser session',()=>{
 assert.match(runtime,/getByTestId\('auth-form'\)/)
 assert.match(runtime,/getByTestId\('auth-email'\)/)
 assert.match(runtime,/getByTestId\('auth-password'\)/)
 assert.match(runtime,/auth\.refreshSession\(\)/)
 assert.match(runtime,/auth\.getUser\(\)/)
 assert.match(runtime,/context\.setOffline\(true\)/)
 assert.match(runtime,/page\.reload\(/)
 assert.match(runtime,/setProviderOnline\(page,true\)/)
 assert.match(runtime,/verifyVoluntaryLogout\(page\)/)
 assert.doesNotMatch(runtime,/ugo-test-provider-auth|localStorage\.setItem|signInWithPassword/)
})
