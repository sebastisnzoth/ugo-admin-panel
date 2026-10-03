import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const shared=fs.readFileSync('src/mvp/shared.tsx','utf8')

test('auth state callback never performs profile queries during TOKEN_REFRESHED',()=>{
  assert.match(shared,/event==='TOKEN_REFRESHED'\)return/)
  const start=shared.indexOf("onAuthStateChange((event,next)=>")
  const end=shared.indexOf("return()=>{active=false",start)
  const callback=shared.slice(start,end)
  const tokenIndex=callback.indexOf("event==='TOKEN_REFRESHED'")
  const deferredProfile=callback.indexOf("window.setTimeout(()=>",tokenIndex)
  assert.ok(tokenIndex>=0)
  assert.ok(deferredProfile>tokenIndex)
})

test('SIGNED_OUT is confirmed from storage before provider session is cleared',()=>{
  assert.match(shared,/event==='SIGNED_OUT'/)
  assert.match(shared,/supabase\.auth\.getSession\(\)\.then/)
  assert.match(shared,/if\(data\.session\)\{setSession\(data\.session\);return\}setSession\(null\);setProfile\(null\)/)
})

test('profile refresh is deferred outside onAuthStateChange callback lock',()=>{
  assert.match(shared,/window\.setTimeout\(\(\)=>\{if\(!active\)return;void loadProfile\(next\)/)
})
