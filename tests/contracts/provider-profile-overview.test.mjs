import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const s=readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
test('profile summarizes stored categories, missing fields and operational actions',()=>{
 assert.match(s,/loadProviderCategories\(p\.categoria_principal_id/)
 assert.match(s,/provider-profile-overview/)
 assert.match(s,/provider-profile-incomplete/)
 assert.match(s,/d\.debtBlocked\?flow\.actions\.openEarnings:.*d\.setOnline\(true\)/)
})
test('photo is checked and previewed before upload, and editing asks before discard',()=>{
 assert.match(s,/file\.size>5\*1024\*1024/)
 assert.match(s,/URL\.createObjectURL\(photoFile\)/)
 assert.match(s,/URL\.revokeObjectURL\(url\)/)
 assert.match(s,/onClick=\{\(\)=>void savePhoto\(\)\}/)
 assert.match(s,/allowDiscard\(profileDirty\)/)
 assert.match(s,/beforeunload/)
})
