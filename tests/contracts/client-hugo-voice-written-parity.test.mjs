import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const location=await readFile(new URL('../../src/mvp/client/ClientLocationScreen.tsx',import.meta.url),'utf8')
const address=await readFile(new URL('../../src/mvp/hugoDefaultAddress.ts',import.meta.url),'utf8')

test('client voice follows the same ordered fields as the written request',()=>{
 assert.match(dock,/if\(missing==='description'\)return speak\([^\n]*¿Qué hay que hacer\?/)
 assert.match(dock,/if\(missing==='address'\)return speak\([^\n]*Casa, Trabajo o “usar mi ubicación”/)
 assert.match(dock,/if\(missing==='when'\)return speak/)
 assert.match(dock,/if\(missing==='payment'\)return speak/)
 assert.doesNotMatch(dock,/askNext\([^\n]*voiceAvailabilityText/)
})

test('voice does not silently consume a default saved address before asking where',()=>{
 assert.match(dock,/const label=savedLabel\(source\)/)
 assert.match(dock,/addressPromise=!current\.address&&label\?resolveClientSavedAddress\(label\):Promise\.resolve\(null\)/)
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
