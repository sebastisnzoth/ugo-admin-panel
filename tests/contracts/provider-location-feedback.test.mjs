import './i18n-test-compat.mjs'
import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider GPS feedback explains distance, freshness failures and geofence',async()=>{
 const source=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(source,/t\('providerGps\.attention'\)/)
 assert.match(source,/t\('providerGps\.searchingDistance'\)/)
 assert.match(source,/t\('providerGps\.distance',\{distance:/)
 assert.match(source,/t\('providerGps\.distanceHelp'/)
 assert.match(source,/t\('providerGps\.arrivalDetected'/)
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

test('online provider transient GPS failures do not leave an obsolete global unavailable notice',async()=>{
 const source=await read('src/mvp/provider/providerData.tsx')
 assert.equal((source.match(/else if\(!providerOnline\|\|!providerAvailable\)setNotice\(\{type:'info',text:t\('providerRuntime\.locationUnavailable'\)\}\)/g)||[]).length,2)
 assert.match(source,/if\(error\.code===1\)setNotice\(\{type:'info',text:t\('providerRuntime\.locationPermission'\)\}\)/)
 const tracker=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(tracker,/if\(locationError\)return <div className="provider-arrival-toast provider-location-error"/)
})
