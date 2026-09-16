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

test('provider location is persisted in backend-compatible point order',()=>{
 assert.match(service,/POINT\(\$\{longitude\} \$\{latitude\}\)/)
 assert.match(service,/update\(\{ubicacion:point,ultima_ubicacion_at:/)
})

test('backend remains authority for the 200 meter arrival gate',()=>{
 assert.match(migration,/p_estado='llegado'/)
 assert.match(migration,/st_distance\(pp\.ubicacion, v_servicio\.ubicacion_cliente\)/)
 assert.match(migration,/v_dist_m > 200/)
})
