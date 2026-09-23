import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const voice = await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const locationScreen = await readFile(new URL('../../src/features/client/request/ClientLocationScreen.tsx', import.meta.url), 'utf8')
const savedAddress = await readFile(new URL('../../src/mvp/hugoDefaultAddress.ts', import.meta.url), 'utf8')
const orderVoice = await readFile(new URL('../../src/features/client/hugo/hugoOrderVoice.ts', import.meta.url), 'utf8')

test('Hugo only resolves current GPS after an explicit current-location intent', () => {
  assert.match(voice, /function wantsGps\(text:string\)/)
  assert.match(voice, /gpsRequested=wantsGps\(source\)\|\|Boolean\(companion\?\.use_current_location\)/)
  assert.match(voice, /if\(gpsRequested\)\{const ok=await captureCurrentLocation\(current\)/)
  assert.match(voice, /use_current_location\?:boolean/)
})

test('spoken or tapped current location uses browser geolocation and persists backend-compatible point order', () => {
  assert.match(voice, /navigator\.geolocation\.getCurrentPosition/)
  assert.match(voice, /reverseGeocode\(lat,lng\)/)
  assert.match(voice, /ubicacion:\`POINT\(\$\{lng\} \$\{lat\}\)\`/)
  assert.match(voice, /sessionStorage\.setItem\('ugo:last-client-location'/)
  assert.match(locationScreen, /const useLocation=\(\)=>/)
  assert.match(locationScreen, /savePickup\(pos\.coords\.latitude,pos\.coords\.longitude,'current'\)/)
})

test('natural request resolves saved Casa and Trabajo addresses through the canonical helper', () => {
  assert.match(voice, /function savedLabel\(text:string\):'Casa'\|'Trabajo'\|null/)
  assert.match(voice, /resolveClientSavedAddress\(label\)/)
  assert.match(savedAddress, /place==='Casa'\?\/casa\|hogar\|residencia\/:\/trabajo\|oficina\|trabalho\|escritorio\//)
  assert.match(locationScreen, /from\('direcciones_cliente'\)/)
  assert.match(locationScreen, /savePickup\(hasCoords\?lat:null,hasCoords\?lng:null,'saved'\)/)
})

test('Hugo understands gardening aliases and scheduled natural language', () => {
  assert.match(orderVoice, /jardineria:\['jardinero','jardineria','jardin','jardineiro','jardinagem'\]/)
  assert.match(orderVoice, /export function hugoTiming\(text:string\)/)
  assert.match(orderVoice, /manana\|amanha/)
  assert.match(orderVoice, /urgency:'scheduled'/)
})
