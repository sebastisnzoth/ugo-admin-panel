import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const voice = await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const locationScreen = await readFile(new URL('../../src/features/client/request/ClientLocationScreen.tsx', import.meta.url), 'utf8')
const savedAddress = await readFile(new URL('../../src/mvp/hugoDefaultAddress.ts', import.meta.url), 'utf8')
const orderVoice = await readFile(new URL('../../src/features/client/hugo/hugoOrderVoice.ts', import.meta.url), 'utf8')

test('Hugo resolves current GPS only through the explicit Gemini Live location tool',()=>{assert.match(voice,/name==='get_current_location'/);assert.match(voice,/captureCurrentLocation\(current!\)/);assert.match(voice,/sendToolResponse/);assert.match(voice,/navigator\.geolocation\.getCurrentPosition/)})

test('spoken or tapped current location uses browser geolocation and persists backend-compatible point order', () => {
  assert.match(voice, /navigator\.geolocation\.getCurrentPosition/)
  assert.match(voice, /reverseGeocode\(lat,lng\)/)
  assert.match(voice, /ubicacion:\`POINT\(\$\{lng\} \$\{lat\}\)\`/)
  assert.match(voice, /sessionStorage\.setItem\('ugo:last-client-location'/)
  assert.match(locationScreen, /const useLocation=\(\)=>/)
  assert.match(locationScreen, /savePickup\(pos\.coords\.latitude,pos\.coords\.longitude,'current'\)/)
})

test('saved Casa and Trabajo remain canonical written-flow locations while Live GPS stays explicit', () => {
  assert.match(savedAddress, /place==='Casa'\?\/casa\|hogar\|residencia\/:\/trabajo\|oficina\|trabalho\|escritorio\//)
  assert.match(locationScreen, /from\('direcciones_cliente'\)/)
  assert.match(locationScreen, /savePickup\(hasCoords\?lat:null,hasCoords\?lng:null,'saved'\)/)
  assert.match(voice, /name==='get_current_location'/)
})

test('Hugo understands gardening aliases and scheduled natural language', () => {
  assert.match(orderVoice, /jardineria:\['jardinero','jardineria','jardin','jardineiro','jardinagem'\]/)
  assert.match(orderVoice, /export function hugoTiming\(text:string\)/)
  assert.match(orderVoice, /manana\|amanha/)
  assert.match(orderVoice, /urgency:'scheduled'/)
})


test('Hugo voice address cannot advance without resolved pickup coordinates', () => {
  assert.match(locationScreen, /geocodeClientAddress\(nextAddress,zone\)/)
  assert.match(locationScreen, /No pudimos ubicar la dirección indicada por Hugo/)
  assert.match(locationScreen, /savePickup\(pickupLat,pickupLng,pickupSource\)/)
  const voiceBlock=locationScreen.match(/const onVoiceDraft=[\s\S]*?window\.addEventListener\(UGO_UI_EVENTS\.clientHugoDraft/)?.[0]||''
  assert.match(voiceBlock, /if\(pickupLat==null\|\|pickupLng==null\)[\s\S]*geocodeClientAddress/)
  assert.match(voiceBlock, /savePickup\(pickupLat,pickupLng,pickupSource\)[\s\S]*setStage\('when'\)/)
})
