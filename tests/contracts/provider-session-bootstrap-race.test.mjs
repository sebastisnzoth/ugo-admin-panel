import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const auth = readFileSync(new URL('../../src/mvp/shared.tsx', import.meta.url), 'utf8')

test('provider session bootstrap ignores a stale initial snapshot after an auth event', () => {
 assert.match(auth, /authEventVersion=0/)
 assert.match(auth, /if\(!active\|\|authEventVersion!==bootstrapVersion\)return/)
 assert.match(auth, /if\(bootstrapVersion===0\)/)
 assert.match(auth, /authEventVersion\+\+/)
})

test('an empty INITIAL_SESSION event is not treated as an authoritative logout', () => {
 assert.match(auth, /event==='INITIAL_SESSION'&&!next/)
 assert.match(auth, /initial_session_empty_ignored/)
 const callback = auth.slice(auth.indexOf("event==='INITIAL_SESSION'&&!next"), auth.indexOf("event==='SIGNED_OUT'"))
 assert.match(callback, /return/)
 assert.doesNotMatch(callback, /setCurrentSession\(null\)|setSessionChecked\(true\)/)
})

test('a real sign-out is rechecked and only a successful empty session clears state', () => {
 const signOutHandler = auth.slice(auth.indexOf("event==='SIGNED_OUT'"), auth.indexOf("event==='TOKEN_REFRESHED'"))
 assert.match(signOutHandler, /supabase\.auth\.getSession\(\)\.then\(\(\{data,error:sessionError\}\)=>\{/)
 assert.match(signOutHandler, /if\(sessionError\)\{unavailable\(sessionError\);return\}/)
 assert.match(signOutHandler, /if\(data\.session\)\{/)
 assert.match(signOutHandler, /setCurrentSession\(null\);setSessionChecked\(true\)/)
 assert.match(signOutHandler, /version!==authEventVersion/)
 assert.match(signOutHandler, /catch\(sessionError=>unavailable\(sessionError,version\)\)/)
})

test('a refreshed session does not trigger an unnecessary profile reload', () => {
 const tokenRefresh = auth.slice(auth.indexOf("event==='TOKEN_REFRESHED'"), auth.indexOf("diagnostic('auth_event'"))
 assert.match(tokenRefresh, /setCurrentSession\(next\)/)
 assert.match(tokenRefresh, /if\(profileUserId\.current!==next\.user\.id\)scheduleProfileLoad\(next\)/)
 assert.doesNotMatch(tokenRefresh, /loadProfile\(next\)/)
})

test('session recovery uses a declared session ref and preserves it after a failed check', () => {
 assert.match(auth, /const sessionRef=useRef<Session\|null>\(null\)/)
 assert.match(auth, /session_preserved_after_signed_out/)
 assert.match(auth, /session_check_failed/)
 const recheckError = auth.slice(auth.indexOf('if(sessionError){unavailable(sessionError);return}'), auth.indexOf('if(data.session){', auth.indexOf('if(sessionError){unavailable(sessionError);return}')))
 assert.doesNotMatch(recheckError, /setCurrentSession\(null\)|setSessionChecked\(true\)/)
})

test('provider login route is shown only after an empty session is confirmed', () => {
 const provider = readFileSync(new URL('../../src/mvp/provider/providerData.tsx', import.meta.url), 'utf8')
 const unresolved = provider.indexOf('if(!session&&!sessionChecked)')
 const login = provider.indexOf('if(!session)return <AuthScreen')
 assert.ok(unresolved>=0&&login>unresolved)
 assert.match(provider,/onAction=\{auth\.retrySession\}/)
 assert.match(provider,/login_route_suppressed/)
 assert.match(provider,/login_route_shown/)
})

test('provider onboarding distinguishes a profile read error from a confirmed missing profile', () => {
 const provider = readFileSync(new URL('../../src/mvp/provider/providerData.tsx', import.meta.url), 'utf8')
 assert.match(provider,/if\(gateError\)\{setProviderProfileStatus\('error'\);throw gateError\}/)
 assert.match(provider,/setProviderProfileStatus\(verifiedProfile\?'present':'absent'\)/)
 assert.match(provider,/providerProfileStatus==='error'/)
 assert.match(provider,/providerProfileStatus==='absent'/)
 assert.match(provider,/onAction=\{\(\)=>void reload\(\)\}/)
})

test('session logout is local and navigation does not revoke other provider sessions', () => {
 const provider = readFileSync(new URL('../../src/mvp/provider/providerData.tsx', import.meta.url), 'utf8')
 const onboarding = readFileSync(new URL('../../src/mvp/ProviderOnboardingGate.tsx', import.meta.url), 'utf8')
 const flow = readFileSync(new URL('../../src/mvp/provider/providerFlow.tsx', import.meta.url), 'utf8')
 assert.match(auth, /auth\.signOut\(\{scope:'local'\}\)/)
 assert.match(provider, /await auth\.signOut\(\)/)
 assert.match(onboarding, /auth\.signOut\(\{scope:'local'\}\)/)
 assert.doesNotMatch(flow, /signOut\s*\(/)
})
