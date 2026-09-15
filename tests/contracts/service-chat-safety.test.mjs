import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('client and provider chat keep Uber-style quick replies', async () => {
  const component = await read('src/mvp/ServiceChat.tsx')
  assert.match(component, /client:\['Perfecto, te espero\.'[^\]]*'Avisame cuando llegues\.'[^\]]*\]/)
  assert.match(component, /provider:\['Estoy en camino\.'[^\]]*'Llegué al lugar\.'[^\]]*'El trabajo está listo\.'[^\]]*\]/)
  assert.match(component, /sendText\(reply,'quick_reply'\)/)
  assert.match(component, /RESPUESTAS RÁPIDAS/)
})

test('frontend blocks direct contact sharing before insert', async () => {
  const component = await read('src/mvp/ServiceChat.tsx')
  assert.match(component, /EMAIL_RE/)
  assert.match(component, /URL_RE/)
  assert.match(component, /SOCIAL_RE/)
  assert.match(component, /HANDLE_RE/)
  assert.match(component, /PHONE_RE/)
  assert.match(component, /hasContactDetails\(clean\)/)
  assert.match(component, /CONTACT_DETAILS_NOT_ALLOWED/)
})

test('database rejects contact details even when the frontend is bypassed', async () => {
  const migration = await read('supabase/migrations/20260915101500_service_chat_contact_guard.sql')
  assert.match(migration, /create or replace function private\.chat_contains_contact_details/)
  assert.match(migration, /whats\?\[\[:space:\]\.\_-\]\*app/)
  assert.match(migration, /instagram/)
  assert.match(migration, /regexp_matches/)
  assert.match(migration, />= 8/)
  assert.match(migration, /CONTACT_DETAILS_NOT_ALLOWED/)
  assert.match(migration, /new\.emisor_rol in \('cliente'::public\.mensaje_rol, 'proveedor'::public\.mensaje_rol\)/)
  assert.match(migration, /create trigger mensajes_contact_guard/)
  assert.match(migration, /before insert or update of contenido on public\.mensajes/)
})
