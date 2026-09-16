import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const service=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')
const migration=fs.readFileSync(new URL('../../supabase/migrations/20260901_stage7_provider_arrival_lifecycle.sql',import.meta.url),'utf8')

test('arrival publishes fresh provider geolocation before requesting llegado',()=>{
 assert.match(service,/if\(state==='llegado'\)await publishProviderLocation\(supabase,serviceId\)/)
 assert.match(service,/navigator\.geolocation\.getCurrentPosition/)
 assert.match(service,/enableHighAccuracy:true/)
 assert.match(service,/maximumAge:15000/)
})

test('provider location is persisted through the canonical service-scoped tracking RPC',()=>{
 assert.match(service,/supabase\.rpc\('actualizar_ubicacion_y_distancia',\{p_lat:latitude,p_lng:longitude,p_servicio_id:serviceId\}\)/)
 assert.doesNotMatch(service,/ultima_ubicacion_at/)
 assert.doesNotMatch(service,/\.from\('perfiles_proveedor'\)\.update\(\{ubicacion:/)
})

test('location failure stays scoped to MAP-GPS and never masquerades as lifecycle success',()=>{
 assert.match(service,/eventType:'provider_location_error'/)
 assert.match(service,/checklistCode:'MAP-GPS'/)
 assert.match(service,/action:'provider\.service\.location'/)
 assert.match(service,/if\(state==='llegado'\)await publishProviderLocation\(supabase,serviceId\)[\s\S]*supabase\.rpc\('avanzar_servicio'/)
})

test('backend remains authority for the 200 meter arrival gate',()=>{
 assert.match(migration,/p_estado='llegado'/)
 assert.match(migration,/st_distance\(pp\.ubicacion, v_servicio\.ubicacion_cliente\)/)
 assert.match(migration,/v_dist_m > 200/)
})
