import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const location=await readFile(new URL('../../src/mvp/client/ClientLocationScreen.tsx',import.meta.url),'utf8')
const address=await readFile(new URL('../../src/mvp/hugoDefaultAddress.ts',import.meta.url),'utf8')

test('client voice follows the canonical ordered request fields without a text composer',()=>{
 assert.match(dock,/if\(missing==='description'\)return speak\([^\n]*¿Qué hay que hacer\?/)
 assert.match(dock,/if\(missing==='address'\)return speak\([^\n]*Casa, Trabajo o “usar mi ubicación”/)
 assert.match(dock,/if\(missing==='when'\)return speak/)
 assert.match(dock,/if\(missing==='payment'\)return speak/)
 assert.match(dock,/nextMissing\(current\)/)
 assert.doesNotMatch(dock,/sendTyped|inputRef|\[typed,setTyped\]/)
})

test('voice uses explicit saved-place or GPS signals and persists the canonical draft',()=>{
 assert.match(dock,/savedLabel\(source\)\|\|companion\?\.address_label/)
 assert.match(dock,/resolveClientSavedAddress\(label\)/)
 assert.match(dock,/accessTokenUserId\(accessToken\)/)
 assert.match(dock,/ugo:guided-request-draft:/)
 assert.match(dock,/voiceJourney:true/)
})

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


test('spoken utilizar mi ubicación triggers GPS directly without requiring the location button',()=>{
 assert.match(dock,/utilizar\|utiliza/)
 assert.match(dock,/gpsRequested=wantsGps\(source\)\|\|Boolean\(companion\?\.use_current_location\)/)
 assert.match(dock,/navigator\.geolocation\.getCurrentPosition/)
 assert.match(dock,/ugo:last-client-location/)
 assert.match(dock,/current\.pickupSource='current'/)
 assert.match(dock,/Promise\.allSettled/)
})

test('one natural turn can fill location time payment and exact dispatch pickup',()=>{
 assert.match(dock,/const applyTurnSignals=/)
 assert.match(dock,/const localWhen=parseHugoWhen\(source\),localPayment=parsePaymentMethod\(source\)/)
 assert.match(dock,/companion\?\.payment_method/)
 assert.match(dock,/pickupFallback:'none'/)
 assert.match(dock,/payment_method:current\.paymentMethod==='pix'\?'pix':'efectivo'/)
 assert.match(dock,/finishOrder/)
})
