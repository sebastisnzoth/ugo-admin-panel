import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const providerGate=fs.readFileSync('src/mvp/ProviderOnboardingGate.tsx','utf8')

test('auth state callback never performs profile queries during TOKEN_REFRESHED',()=>{
  assert.match(providerGate,/event==='TOKEN_REFRESHED'\)return/)
  const start=providerGate.indexOf("onAuthStateChange((event,s)=>")
  const end=providerGate.indexOf("return()=>{active=false",start)
  const callback=providerGate.slice(start,end)
  const tokenIndex=callback.indexOf("event==='TOKEN_REFRESHED'")
  const deferredProfile=callback.indexOf("window.setTimeout(()=>",tokenIndex)
  assert.ok(tokenIndex>=0)
  assert.ok(deferredProfile>tokenIndex)
})

test('SIGNED_OUT is confirmed from storage before provider session is cleared',()=>{
  assert.match(providerGate,/event==='SIGNED_OUT'/)
  assert.match(providerGate,/sb\.auth\.getSession\(\)\.then/)
  assert.match(providerGate,/if\(data\.session\)\{setSession\(data\.session\);return\}setSession\(null\);setUser\(null\);setP\(null\)/)
})

test('profile refresh is deferred outside onAuthStateChange callback lock',()=>{
  assert.match(providerGate,/window\.setTimeout\(\(\)=>\{if\(!active\)return;void load\(s\)/)
})
