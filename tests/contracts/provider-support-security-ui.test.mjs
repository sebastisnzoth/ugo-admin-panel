import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
test('support and security remain separate and keep existing handlers',()=>{
 assert.match(source,/provider-security-heading/)
 assert.match(source,/provider-support-heading/)
 assert.match(source,/d\.changePassword\(password\)/)
 assert.match(source,/flow\.actions\.openDispute\(id\)/)
 assert.match(source,/flow\.actions\.openHistory/)
 assert.match(source,/aria-pressed=\{showPasswords\}/)
 assert.match(source,/setPassword\(''\);setPasswordConfirm\(''\);setShowPasswords\(false\);setPasswordSaved\(true\)/)
 assert.match(source,/role="status">\{t\('providerSupportUx.passwordSaved'\)\}/)
})

test('provider support selects an owned exact service and handles empty and failed loads',()=>{
 const selector=readFileSync('src/mvp/provider/ProviderSupportSelector.tsx','utf8')
 assert.match(selector,/auth\.getUser\(\)/)
 assert.match(selector,/\.eq\('proveedor_id',auth\.user\.id\)/)
 assert.match(selector,/onSelect\(item\.id\)/)
 assert.match(selector,/providerSupportFlow\.empty/)
 assert.match(selector,/providerSupportFlow\.loadError/)
 assert.match(selector,/setAttempt\(value=>value\+1\)/)
 assert.match(selector,/onHistory/)
})

test('provider dispute confirms before uploading and offers a way back if unavailable',()=>{
 const dock=readFileSync('src/mvp/DisputeDock.tsx','utf8')
 const root=readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
 assert.ok(dock.indexOf('await confirm(')<dock.indexOf('await uploadEvidence(files)'))
 assert.match(dock,/role==='provider'&&!dispute&&!await confirm/)
 assert.match(dock,/providerSupportFlow\.unavailable/)
 assert.match(dock,/onClose\?\.\(\)/)
 assert.match(root,/onClose=\{screen==='dispute'\?flow\.actions\.openProfile:undefined\}/)
})
