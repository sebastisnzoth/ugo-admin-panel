import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('provider language selection is in profile, not the shared top bar',()=>{
 const root=readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
 const profile=readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
 assert.doesNotMatch(root,/LanguageSelector|provider-client-topbar-language/)
 assert.match(profile,/id="ugo-provider-profile-language"/)
 assert.match(profile,/setLocale\(e\.target\.value as UgoLocale\)/)
})
