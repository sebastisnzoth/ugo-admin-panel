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


test('provider desktop heartbeat falls back from high accuracy GPS without weakening freshness',async()=>{
 const s=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(s,/GEO_HIGH_ACCURACY_OPTIONS/)
 assert.match(s,/enableHighAccuracy:true/)
 assert.match(s,/GEO_FALLBACK_OPTIONS/)
 assert.match(s,/enableHighAccuracy:false/)
 assert.match(s,/maximumAge:0/)
 assert.match(s,/getFreshBrowserPosition/)
 assert.match(s,/navigator\.geolocation\.getCurrentPosition\(resolve,highError/)
 assert.match(s,/if\(highError\.code===1\)\{reject\(highError\);return\}/)
 assert.match(s,/navigator\.geolocation\.getCurrentPosition\(resolve,reject,GEO_FALLBACK_OPTIONS\)/)
 assert.match(s,/age>MAX_POSITION_AGE_MS/)
 assert.match(s,/publicar_ubicacion_disponibilidad_proveedor/)
})
