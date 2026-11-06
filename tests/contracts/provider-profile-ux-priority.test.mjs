import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const profile=readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
test('profile prioritizes identity and safely resets drafts when switching editors',()=>{
 assert.ok(profile.indexOf('className="provider-profile-identity"')<profile.indexOf('className="provider-card provider-profile-language"'))
 assert.match(profile,/aria-expanded=\{editing\}/)
 assert.match(profile,/const toggleEditing=async.*allowDiscard\(profileDirty\).*setZoneEditing\(false\)/)
 assert.match(profile,/const openZoneEditor=async.*allowDiscard\(profileDirty\).*setEditing\(false\)/)
})
test('profile reflects availability and gracefully handles a failed photo',()=>{
 assert.match(profile,/d\.profilePhotoUrl!==failedPhotoUrl/)
 assert.match(profile,/onError=\{\(\)=>setFailedPhotoUrl/)
 assert.match(profile,/!d\.matchingReady\?t\('providerHome\.gpsPending'\)/)
 assert.match(profile,/p\.estado_verificacion==='verificado'&&<span/)
})
