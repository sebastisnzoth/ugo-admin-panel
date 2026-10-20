import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const providerGate=fs.readFileSync('src/mvp/ProviderOnboardingGate.tsx','utf8')
const callbackStart=providerGate.indexOf("onAuthStateChange((event,next)=>")
const callbackEnd=providerGate.indexOf('\n  })',callbackStart)
const callback=providerGate.slice(callbackStart,callbackEnd)

test('TOKEN_REFRESHED does not re-query an already-loaded onboarding profile',()=>{
  const tokenIndex=callback.indexOf("event==='TOKEN_REFRESHED'")
  const tokenEnd=callback.indexOf('\n    return\n   }\n   if(next){',tokenIndex)
  const tokenBranch=callback.slice(tokenIndex,tokenEnd)
  assert.ok(callbackStart>=0&&callbackEnd>callbackStart)
  assert.ok(tokenIndex>=0&&tokenEnd>tokenIndex)
  assert.match(tokenBranch,/profileUserId\.current!==next\.user\.id&&loadingProfileUserId\.current!==next\.user\.id/)
  assert.match(tokenBranch,/void load\(next\)/)
})

test('SIGNED_OUT is checked against storage before the onboarding session is cleared',()=>{
  assert.match(providerGate,/event==='SIGNED_OUT'/)
  assert.match(providerGate,/sb\.auth\.getSession\(\)\.then\(\(\{data,error\}\)=>\{/)
  assert.match(providerGate,/if\(error\)\{failSessionCheck\(error,version\);return\}/)
  assert.match(providerGate,/version!==authEventVersion/)
  assert.match(providerGate,/signed_out_confirmed/)
  assert.match(providerGate,/setSession\(null\);setUser\(null\);setP\(null\)/)
})

test('profile refresh is deferred outside onAuthStateChange callback lock and stale loads are fenced',()=>{
  assert.match(providerGate,/window\.setTimeout\(\(\)=>\{if\(!active\|\|version!==authEventVersion\)return;void load\(next\)/)
  assert.match(providerGate,/generation!==loadGeneration\.current/)
})

test('a transient session-check error preserves onboarding credentials and exposes retry',()=>{
  assert.match(providerGate,/setSessionCheckFailed\(!terminal\)/)
  assert.match(providerGate,/t\('sharedUi\.sessionCheckFailed'\)/)
  assert.match(providerGate,/if\(!session&&!sessionChecked\)/)
  assert.match(providerGate,/onClick=\{retrySession\}/)
})
