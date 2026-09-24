import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const service=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')
const migration=fs.readFileSync(new URL('../../supabase/migrations/20260924162000_provider_arrival_gps_gate.sql',import.meta.url),'utf8')
const activeJob=fs.readFileSync(new URL('../../src/mvp/provider/ProviderActiveJob.tsx',import.meta.url),'utf8')
const tracker=fs.readFileSync(new URL('../../src/mvp/ProviderLocationTracker.tsx',import.meta.url),'utf8')
const locationButton=fs.readFileSync(new URL('../../src/mvp/AppLocationButton.tsx',import.meta.url),'utf8')
const nullIslandGuard=fs.readFileSync(new URL('../../supabase/migrations/20260921221500_reject_null_island_provider_location.sql',import.meta.url),'utf8')

test('arrival publishes fresh device geolocation before the dedicated backend arrival RPC',()=>{
 const helperStart=service.indexOf('async function markProviderArrived')
 const publishIndex=service.indexOf('await publishProviderLocation(supabase,serviceId)',helperStart)
 const arrivalRpcIndex=service.indexOf("supabase.rpc('marcar_llegada_proveedor'",helperStart)
 assert.ok(helperStart>=0&&publishIndex>helperStart&&arrivalRpcIndex>publishIndex)
 assert.match(service,/if\(state==='llegado'\)[\s\S]*markProviderArrived\(supabase,serviceId\)/)
 assert.match(service,/navigator\.geolocation\.watchPosition/)
 assert.match(service,/enableHighAccuracy:true/)
 assert.match(service,/maximumAge:0/)
 assert.match(service,/GPS_TARGET_ACCURACY_M=80/)
})

test('provider arrival location is persisted through the hardened service-scoped publication RPC',()=>{
 assert.match(service,/supabase\.rpc\('publicar_ubicacion_proveedor',\{p_servicio_id:serviceId,p_lat:latitude,p_lng:longitude,p_captured_at:capturedAt,p_accuracy_m:accuracy\}\)/)
 assert.match(service,/new Date\(Number\(position\.timestamp\)\)\.toISOString\(\)/)
 assert.doesNotMatch(service,/ultima_ubicacion_at/)
 assert.doesNotMatch(service,/\.from\('perfiles_proveedor'\)\.update\(\{ubicacion:/)
})

test('arrival GPS failure is a P0 blocker and never reaches arrival mutation without valid publication',()=>{
 assert.match(service,/eventType:'provider_location_error'/)
 assert.match(service,/severity:'P0'/)
 assert.match(service,/checklistCode:'MAP-GPS'/)
 assert.match(service,/action:'provider\.service\.location'/)
 const helperStart=service.indexOf('async function markProviderArrived')
 const publishIndex=service.indexOf('await publishProviderLocation(supabase,serviceId)',helperStart)
 const arrivalRpcIndex=service.indexOf("supabase.rpc('marcar_llegada_proveedor'",helperStart)
 assert.ok(helperStart>=0&&publishIndex>helperStart&&arrivalRpcIndex>publishIndex)
 const arrivalBranchStart=service.indexOf("if(state==='llegado')")
 const genericRpcIndex=service.indexOf("supabase.rpc('avanzar_servicio'",arrivalBranchStart)
 const arrivalBranch=service.slice(arrivalBranchStart,genericRpcIndex)
 assert.match(arrivalBranch,/markProviderArrived\(supabase,serviceId\)/)
 assert.doesNotMatch(arrivalBranch,/avanzar_servicio/)
 assert.match(service,/GPS_ACCEPTABLE_ACCURACY_M=250/)
 assert.match(service,/GPS_FRESH_MS=30_000/)
 assert.match(service,/acceptablePosition/)
})

test('backend remains authority for fresh GPS and the 200 meter arrival gate',()=>{
 assert.match(migration,/create or replace function public\.marcar_llegada_proveedor/)
 assert.match(migration,/v_age_ms < -5000 or v_age_ms > 30000/)
 assert.match(migration,/v_accuracy_m is null or v_accuracy_m <= 0 or v_accuracy_m > 250/)
 assert.match(migration,/extensions\.st_distance\(v_provider_location,v_client_location\)/)
 assert.match(migration,/v_distance_m > 200/)
 assert.match(migration,/set estado='llegado'/)
})


test('manual arrival cannot bypass the fresh GPS publication path',()=>{
 assert.doesNotMatch(activeJob,/supabase\.rpc\('avanzar_servicio'/)
 assert.match(activeJob,/d\.advance\('llegado'\)/)
})

test('provider background tracking and profile location both request fresh GPS',()=>{
 assert.match(tracker,/MIN_WRITE_MS=5_000/)
 assert.match(tracker,/MIN_MOVE_M=5/)
 assert.match(tracker,/maximumAge:0/)
 assert.match(locationButton,/rpc\('actualizar_ubicacion_y_distancia'/)
 assert.match(locationButton,/p_servicio_id:null/)
 assert.match(locationButton,/maximumAge:0/)
})


test('arrival rejects Null Island instead of persisting a fake provider position',()=>{
 assert.match(service,/usablePosition/)
 assert.match(service,/Math\.abs\(lat\)<0\.0001&&Math\.abs\(lng\)<0\.0001/)
 assert.match(tracker,/Math\.abs\(point\[0\]\)<0\.0001&&Math\.abs\(point\[1\]\)<0\.0001/)
 assert.match(nullIslandGuard,/abs\(p_lat\) < 0\.0001 and abs\(p_lng\) < 0\.0001/)
 assert.match(nullIslandGuard,/set ubicacion=null/)
 assert.match(nullIslandGuard,/set lat=null,[\s\S]*lng=null/)
})


test('provider tracker surfaces precise GPS failures and never auto-arrives from an error callback',()=>{
 assert.match(tracker,/error=>\{setLocationError\(error\.code===1\?'UGO necesita permiso de ubicación precisa/)
 assert.match(tracker,/No pudimos obtener tu GPS\. Revisá que la ubicación del dispositivo esté activada\./)
 assert.match(tracker,/El GPS tardó demasiado en responder\. Reintentando/)
 const errorHandler=tracker.slice(tracker.indexOf('error=>{setLocationError'),tracker.indexOf('}, {enableHighAccuracy:true'))
 assert.doesNotMatch(errorHandler,/autoArrivalRef/)
 assert.doesNotMatch(errorHandler,/actualizar_ubicacion_y_distancia/)
})
