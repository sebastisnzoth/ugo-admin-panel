import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const auth = readFileSync(new URL('../../src/mvp/shared.tsx', import.meta.url), 'utf8')

test('provider session bootstrap ignores a stale initial snapshot after an auth event', () => {
 assert.match(auth, /let authEventVersion=0/)
 assert.match(auth, /if\(!active\|\|authEventVersion>0\)return/)
 assert.match(auth, /authEventVersion\+\+/)
})

test('an initial empty session resolves loading and a real sign-out is rechecked', () => {
 assert.match(auth, /event==='INITIAL_SESSION'&&!next/)
 assert.match(auth, /event==='SIGNED_OUT'/)
 assert.match(auth, /supabase\.auth\.getSession\(\)\.then\(\(\{data\}\)=>\{/)
 assert.match(auth, /setLoading\(false\)/)
})

test('a refreshed session does not trigger a profile reload', () => {
 assert.match(auth, /event==='TOKEN_REFRESHED'\)return/)
})

test('auth state recovery never reads an undeclared sessionRef and preserves stored session', () => {
 assert.doesNotMatch(auth, /sessionRef\.current/)
 assert.match(auth, /if\(data\.session\)\{setSession\(data\.session\);return\}/)
})

test('session logout is local and navigation does not revoke other provider sessions', () => {
 const provider = readFileSync(new URL('../../src/mvp/provider/providerData.tsx', import.meta.url), 'utf8')
 const onboarding = readFileSync(new URL('../../src/mvp/ProviderOnboardingGate.tsx', import.meta.url), 'utf8')
 const flow = readFileSync(new URL('../../src/mvp/provider/providerFlow.tsx', import.meta.url), 'utf8')
 assert.match(auth, /auth\.signOut\(\{scope:'local'\}\)/)
 assert.match(provider, /auth\.signOut\(\{scope:'local'\}\)/)
 assert.match(onboarding, /auth\.signOut\(\{scope:'local'\}\)/)
 assert.doesNotMatch(flow, /signOut\s*\(/)
})
