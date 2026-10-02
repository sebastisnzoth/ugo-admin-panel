import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider live tracker rejects inaccurate and stale GPS before backend writes or auto-arrival',async()=>{const s=await read('src/mvp/ProviderLocationTracker.tsx');assert.match(s,/MAX_ACCEPTABLE_ACCURACY_M=250/);assert.match(s,/MAX_POSITION_AGE_MS=30_000/);assert.match(s,/accuracy>MAX_ACCEPTABLE_ACCURACY_M/);assert.match(s,/age>MAX_POSITION_AGE_MS/);const accuracy=s.indexOf('accuracy>MAX_ACCEPTABLE_ACCURACY_M'),arrivalRpc=s.indexOf("rpc.rpc('publicar_ubicacion_proveedor'"),availabilityRpc=s.indexOf("rpc.rpc('publicar_ubicacion_disponibilidad_proveedor'");assert.ok(accuracy>0&&arrivalRpc>accuracy&&availabilityRpc>accuracy,'GPS quality gate must run before trusted location RPCs')})

test('provider availability GPS only publishes while both online and available, but en-route tracking remains active',async()=>{
 const s=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(s,/trackingProfile&&trackingProfile\.online&&trackingProfile\.disponible/)
 assert.match(s,/row\.online&&row\.disponible/)
 assert.match(s,/const enRoute=service\?\.estado==='en_camino'/)
 assert.match(s,/!available&&!enRoute/)
 assert.doesNotMatch(s,/online\|\|trackingProfile\.disponible/)
})

test('en-route trusted GPS RPC failures are surfaced instead of silently swallowed',async()=>{
 const s=await read('src/mvp/ProviderLocationTracker.tsx')
 const arrivalRpc=s.indexOf("rpc.rpc('publicar_ubicacion_proveedor'")
 assert.ok(arrivalRpc>=0)
 const rpcError=s.indexOf('if(error){',arrivalRpc)
 assert.ok(rpcError>arrivalRpc)
 const tail=s.slice(rpcError,rpcError+500)
 assert.match(tail,/if\(enRoute\)setLocationError/)
 assert.match(tail,/No pudimos publicar tu GPS reciente/)
})

test('provider en-route UI exposes GPS freshness and precision without trusting stale fixes',async()=>{
 const s=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(s,/provider-location-freshness/)
 assert.match(s,/GPS reciente/)
 assert.match(s,/GPS desactualizado/)
 assert.match(s,/precisión ±/)
 assert.match(s,/setLastFix\(\{capturedAt:Number\(pos\.timestamp\|\|Date\.now\(\)\),accuracy\}\)/)
 assert.match(s,/fixAgeMs<=MAX_POSITION_AGE_MS/)
 assert.match(s,/setInterval\(\(\)=>setNowMs\(Date\.now\(\)\),1_000\)/)
})


test('provider desktop heartbeat prefers compatible GPS, avoids overlapping acquisitions and preserves freshness',async()=>{
 const s=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(s,/GEO_COMPATIBLE_OPTIONS/)
 assert.match(s,/enableHighAccuracy:false,maximumAge:15_000,timeout:12_000/)
 assert.match(s,/GEO_HIGH_ACCURACY_OPTIONS/)
 assert.match(s,/enableHighAccuracy:true,maximumAge:15_000,timeout:15_000/)
 assert.match(s,/getFreshBrowserPosition/)
 const compatible=s.indexOf('oneBrowserPosition(GEO_COMPATIBLE_OPTIONS)')
 const high=s.indexOf('oneBrowserPosition(GEO_HIGH_ACCURACY_OPTIONS)')
 assert.ok(compatible>=0&&high>compatible,'compatible acquisition must run before high accuracy fallback')
 assert.match(s,/usableBrowserPosition\(compatible\)/)
 assert.match(s,/if\(heartbeatBusy\)return/)
 assert.match(s,/heartbeatBusy=true/)
 assert.match(s,/finally\{heartbeatBusy=false\}/)
 assert.match(s,/window\.addEventListener\('focus',onForeground\)/)
 assert.match(s,/document\.addEventListener\('visibilitychange',onForeground\)/)
 assert.match(s,/age>MAX_POSITION_AGE_MS/)
 assert.match(s,/publicar_ubicacion_disponibilidad_proveedor/)
})
