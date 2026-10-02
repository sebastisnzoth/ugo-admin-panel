import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('voice order cannot confirm a typed/manual address until coordinates resolve',async()=>{
 const source=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx')
 assert.match(source,/function hasResolvedPickup\(current:Draft\)/)
 assert.match(source,/!current\.address\|\|!hasResolvedPickup\(current\)/)
 assert.match(source,/const resolved=await geocodeClientAddress\(value\)/)
 assert.match(source,/current\.pickupLat=resolved\.latitude/)
 assert.match(source,/current\.pickupLng=resolved\.longitude/)
 assert.match(source,/No pude ubicar esa dirección/)
})

test('online idle provider refreshes trusted GPS on a heartbeat',async()=>{
 const source=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(source,/if\(!available\|\|enRoute\|\|!navigator\.geolocation\)return/)
 assert.match(source,/const publishHeartbeat=\(\)=>navigator\.geolocation\.getCurrentPosition/)
 assert.match(source,/publicar_ubicacion_disponibilidad_proveedor/)
 assert.match(source,/window\.setInterval\(publishHeartbeat,AVAILABILITY_HEARTBEAT_MS\)/)
 assert.match(source,/maximumAge:0/)
})
