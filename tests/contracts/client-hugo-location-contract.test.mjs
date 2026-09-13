import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const client = await readFile(new URL('../../src/mvp/client/ClientGuidedRequest.tsx', import.meta.url), 'utf8')

test('Hugo asks explicit consent before resolving current client location', () => {
  assert.match(client, /type\s+Step='idle'\|'request'\|'review'\|'matching'/)
  assert.match(client, /locationConsent/)
  assert.match(client, /wantsCurrentLocation\(text\)[\s\S]*setLocationConsent\(true\)[\s\S]*Me autorizás a usar tu ubicación actual/i)
  assert.match(client, /if\(locationConsent\)\{if\(affirmative\(text\)\)\{await resolveCurrentLocation\(\);return\}/)
  assert.match(client, /if\(negative\(text\)\)\{setLocationConsent\(false\)/)
})

test('affirmed location uses browser geolocation and persists backend-compatible point order', () => {
  assert.match(client, /navigator\.geolocation\.getCurrentPosition\(/)
  assert.match(client, /const lat=position\.coords\.latitude,lng=position\.coords\.longitude/)
  assert.match(client, /reverseGeocode\(lat,lng\)/)
  assert.match(client, /ubicacion:`POINT\(\$\{lng\} \$\{lat\}\)`/)
  assert.match(client, /sessionStorage\.setItem\('ugo:last-client-location'/)
})

test('natural request resolves saved Casa and Trabajo addresses', () => {
  assert.match(client, /function\s+resolveSavedAddress\(text:string\)/)
  assert.match(client, /mi casa\|en casa\|casa\|hogar\|minha casa\|em casa/)
  assert.match(client, /trabajo\|oficina\|mi trabajo\|meu trabalho\|escritorio/)
  assert.match(client, /address:saved\.direccion,addressLabel:saved\.etiqueta/)
})

test('Hugo understands gardening aliases and scheduled natural language', () => {
  assert.match(client, /jardineria:\['jardinero','jardineria','jardin','jardineiro','jardinagem'\]/)
  assert.match(client, /function\s+parseTiming\(text:string\)/)
  assert.match(client, /manana\|amanha/)
  assert.match(client, /when:'programar',scheduleAt:localInputValue\(date\)/)
  assert.match(client, /mañana a las 10/i)
})
