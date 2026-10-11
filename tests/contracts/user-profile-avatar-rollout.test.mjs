import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const avatar=fs.readFileSync('src/mvp/UserProfileAvatar.tsx','utf8')
const history=fs.readFileSync('src/mvp/ServiceHistoryPanel.tsx','utf8')
const chat=fs.readFileSync('src/mvp/ServiceChat.tsx','utf8')
const admin=fs.readFileSync('src/mvp/AdminUsersPanel.tsx','utf8')
const trace=fs.readFileSync('src/mvp/AdminUserTracePanel.tsx','utf8')

test('shared avatar uses profile photos and initials fallback',()=>{
  assert.match(avatar,/client-public/)
  assert.match(avatar,/provider-public/)
  assert.match(avatar,/onError/)
  assert.match(avatar,/initials\(name\)/)
})

test('service history renders both participant profile photos',()=>{
  assert.match(history,/UserProfileAvatar/)
  assert.match(history,/clienteFotoPath/)
  assert.match(history,/proveedorFotoPath/)
  assert.match(history,/foto_perfil_path/)
})

test('service chat identifies each message author with their avatar',()=>{
  assert.match(chat,/UserProfileAvatar/)
  assert.match(chat,/selfPhotoPath/)
  assert.match(chat,/otherPhotoPath/)
})

test('admin directory and user trace show profile photos',()=>{
  assert.match(admin,/UserProfileAvatar/)
  assert.match(admin,/foto_perfil_path/)
  assert.match(trace,/UserProfileAvatar/)
})
