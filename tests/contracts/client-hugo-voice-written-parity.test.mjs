import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const location=await readFile(new URL('../../src/features/client/request/ClientLocationScreen.tsx',import.meta.url),'utf8')
const address=await readFile(new URL('../../src/mvp/hugoDefaultAddress.ts',import.meta.url),'utf8')

test('client Live tools enforce the canonical request fields before confirmed creation',()=>{
 assert.match(dock,/name==='set_request_category'/)
 assert.match(dock,/name==='set_request_description'/)
 assert.match(dock,/name==='get_current_location'/)
 assert.match(dock,/name==='set_schedule'/)
 assert.match(dock,/name==='set_payment_method'/)
 assert.match(dock,/const missing=nextMissing\(current\)/)
 assert.match(dock,/missing!=='confirm'/)
 assert.doesNotMatch(dock,/sendTyped|inputRef|\[typed,setTyped\]/)
})

test('voice persists the canonical Live request draft and authenticated client context',()=>{assert.match(dock,/accessTokenUserId\(accessToken\)/);assert.match(dock,/ugo:guided-request-draft:/);assert.match(dock,/voiceJourney:true/);assert.match(dock,/sendToolResponse/)})

test('voice current location persists exact pickup coordinates into canonical request',()=>{
 assert.match(dock,/pickupLat=lat/)
 assert.match(dock,/pickupLng=lng/)
 assert.match(dock,/pickupSource='current'/)
 assert.match(dock,/ugo:last-client-location/)
 assert.match(dock,/POINT\(\$\{lng\} \$\{lat\}\)/)
 assert.match(location,/pickupLat/)
 assert.match(location,/pickupLng/)
 assert.match(location,/pickupSource/)
 assert.match(location,/savePickup\(hasCoords\?lat:null,hasCoords\?lng:null,source\)/)
})

test('saved voice places preserve coordinates when available',()=>{
 assert.match(address,/latitud,longitud/)
 assert.match(address,/latitude:Number\.isFinite/)
 assert.match(address,/longitude:Number\.isFinite/)
})


test('Gemini Live current-location tool captures and persists exact GPS',()=>{assert.match(dock,/name==='get_current_location'/);assert.match(dock,/navigator\.geolocation\.getCurrentPosition/);assert.match(dock,/ugo:last-client-location/);assert.match(dock,/current\.pickupSource='current'/);assert.match(dock,/Promise\.allSettled/)})

test('Live tools can fill schedule payment and create exact dispatch pickup',()=>{assert.match(dock,/name==='set_schedule'/);assert.match(dock,/name==='set_payment_method'/);assert.match(dock,/pickupFallback:'none'/);assert.match(dock,/payment_method:current\.paymentMethod==='pix'\?'pix':'efectivo'/);assert.match(dock,/name==='create_service_request'/)})
