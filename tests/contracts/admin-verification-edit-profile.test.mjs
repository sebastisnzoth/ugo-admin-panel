import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const verification=readFileSync('src/mvp/AdminProviderVerificationPanel.tsx','utf8')
const editor=readFileSync('src/mvp/AdminUsersPanel.tsx','utf8')
const css=readFileSync('src/mvp/admin-provider-verification.css','utf8')
test('provider verification includes authenticated profile editor, independent from KYC actions',()=>{
 assert.match(verification,/onClick=\{\(\)=>setEditProviderId\(r\.usuario_id\)\}/)
 assert.match(verification,/<AdminUsersPanel key=\{editProviderId\} initialEditUserId=\{editProviderId\} initialFilter="proveedor" embedded\/>/)
 assert.match(verification,/providerState\(r,'verificado'\)/)
 assert.match(editor,/initialEditUserId/)
 assert.match(editor,/usersQuery=usersQuery\.eq\('id',initialEditUserId\)/)
 assert.match(editor,/rpc\('admin_update_user_profile'/)
})
test('edit overlay fits handheld display',()=>{
 assert.match(css,/ugo-verification-edit-backdrop/)
 assert.match(css,/@media\(max-width:620px\)/)
 assert.match(css,/max-height:100dvh/)
})
