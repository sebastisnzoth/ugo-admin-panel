import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const component=readFileSync('src/mvp/provider/ProviderVerifiedDocuments.tsx','utf8')
const profile=readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
test('verification panel reads only approved metadata for the authenticated provider',()=>{
 assert.match(component,/getRoleSupabase\('provider'\)/)
 assert.match(component,/auth\.getUser\(\)/)
 assert.match(component,/\.eq\('usuario_id',auth\.user\.id\)\.eq\('estado','aprobado'\)/)
 assert.match(component,/select\('id,tipo,revisado_at'\)/)
 assert.doesNotMatch(component,/url_storage|createSignedUrl|\.storage/)
 assert.match(component,/providerDocuments\.empty/)
 assert.match(component,/providerDocuments\.error/)
 assert.match(profile,/documentsOpen&&<ProviderVerifiedDocuments\/>/)
})
