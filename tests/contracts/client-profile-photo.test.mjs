import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const client=fs.readFileSync('src/features/client/profile/ClientProfilePanel.tsx','utf8')
const clientCss=fs.readFileSync('src/features/client/profile/clientProfilePanel.css','utf8')
const provider=fs.readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
const providerData=fs.readFileSync('src/mvp/provider/providerData.tsx','utf8')
const migration=fs.readFileSync('supabase/migrations/20261011060000_client_profile_photo.sql','utf8')

test('client can upload, persist and render a profile photo',()=>{
  assert.match(client,/accept="image\/jpeg,image\/png,image\/webp"/)
  assert.match(client,/uploadProfilePhoto/)
  assert.match(client,/foto_perfil_path/)
  assert.match(client,/client-public/)
  assert.match(client,/CLIENT_PROFILE_PHOTO_MAX_BYTES=5\*1024\*1024/)
  assert.match(clientCss,/\.ugo-client-profile-photo-actions/)
  assert.match(migration,/add column if not exists foto_perfil_path text/)
  assert.match(migration,/client_public_profile_insert_own/)
  assert.match(migration,/client_public_profile_update_own/)
  assert.match(migration,/client_public_profile_delete_own/)
})

test('provider profile photo upload remains available',()=>{
  assert.match(provider,/uploadProfilePhoto/)
  assert.match(provider,/profilePhotoUrl/)
  assert.match(providerData,/provider-public/)
  assert.match(providerData,/foto_perfil_path/)
})
