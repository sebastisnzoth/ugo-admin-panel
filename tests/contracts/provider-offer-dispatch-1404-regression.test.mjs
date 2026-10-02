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
 assert.match(source,/const publishHeartbeat=async\(\)=>/)
 assert.match(source,/const pos=await getFreshBrowserPosition\(\)/)
 assert.match(source,/publicar_ubicacion_disponibilidad_proveedor/)
 assert.match(source,/window\.setInterval\(\(\)=>void publishHeartbeat\(\),AVAILABILITY_HEARTBEAT_MS\)/)
 assert.match(source,/maximumAge:0/)
})


test('online provider never hides a failed or stale GPS heartbeat',async()=>{
 const source=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(source,/if\(!available&&!enRoute\)return/)
 assert.match(source,/setLocationError\(geoError\.code===1\?'UGO perdió el permiso de ubicación precisa/)
 assert.match(source,/const idleGpsStale=available&&\(!lastFix\|\|fixAgeMs==null\|\|fixAgeMs>MAX_POSITION_AGE_MS\)/)
 assert.match(source,/Online, pero fuera del matching/)
 assert.match(source,/UGO necesita renovar tu GPS para poder enviarte nuevos pedidos/)
})
