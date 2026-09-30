import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider GPS feedback explains distance, freshness failures and geofence',async()=>{
 const source=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(source,/GPS necesita atención/)
 assert.match(source,/Buscando tu distancia exacta al cliente/)
 assert.match(source,/m para llegar/)
 assert.match(source,/geofence de \{ARRIVAL_RADIUS_M\} m/)
 assert.match(source,/Llegada detectada/)
 assert.match(source,/MAX_POSITION_AGE_MS/)
 assert.match(source,/MAX_ACCEPTABLE_ACCURACY_M/)
})

test('provider GPS feedback remains informational until backend arrival validation',async()=>{
 const source=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(source,/publicar_ubicacion_proveedor/)
 assert.match(source,/validMeters<=ARRIVAL_RADIUS_M/)
 assert.match(source,/autoArrivalRef\.current/)
 assert.doesNotMatch(source,/setDistanceToClient\(0\)/)
})
