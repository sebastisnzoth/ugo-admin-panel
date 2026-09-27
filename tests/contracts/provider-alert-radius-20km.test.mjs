import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
const R=6_371_000
const toRad=v=>v*Math.PI/180
const haversine=(a,b)=>{
 const dLat=toRad(b[0]-a[0]),dLng=toRad(b[1]-a[1]),lat1=toRad(a[0]),lat2=toRad(b[0])
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
 return 2*R*Math.asin(Math.sqrt(h))
}
const northOf=(lat,lng,meters)=>[lat+(meters/R)*(180/Math.PI),lng]

test('backend matching enforces 20km radius with PostGIS and fresh trusted GPS',async()=>{
 const sql=await read('supabase/migrations/20260927120000_provider_alert_radius_20km.sql')
 assert.match(sql,/v_alert_radius_m constant double precision := 20000/)
 assert.match(sql,/extensions\.st_dwithin\(v_servicio\.ubicacion_cliente,pp\.ubicacion,v_alert_radius_m\)/)
 assert.match(sql,/pp\.ubicacion_updated_at >= now\(\)-v_gps_freshness/)
 assert.match(sql,/v_gps_freshness constant interval := interval '30 seconds'/)
 assert.match(sql,/pp\.ubicacion_accuracy_m <= 250/)
 assert.match(sql,/Ubicación válida del cliente requerida para distribuir el pedido/)
 assert.match(sql,/abs\(extensions\.st_y\(pp\.ubicacion::extensions\.geometry\)\) < 0\.0001/)
})

test('provider availability publishes trusted fresh GPS before matching',async()=>{
 const [sql,tracker]=await Promise.all([
  read('supabase/migrations/20260927120000_provider_alert_radius_20km.sql'),
  read('src/mvp/ProviderLocationTracker.tsx'),
 ])
 assert.match(sql,/public\.publicar_ubicacion_disponibilidad_proveedor/)
 assert.match(sql,/ubicacion_updated_at=p_captured_at/)
 assert.match(sql,/ubicacion_accuracy_m=p_accuracy_m/)
 assert.match(sql,/v_age_ms > 30000/)
 assert.match(tracker,/rpc\.rpc\('publicar_ubicacion_disponibilidad_proveedor'/)
 assert.match(tracker,/p_captured_at:capturedAt/)
 assert.match(tracker,/p_accuracy_m:accuracy/)
 assert.match(tracker,/AVAILABILITY_HEARTBEAT_MS=20_000/)
 assert.match(tracker,/!moved&&!heartbeatDue/)
})

test('notification trigger independently suppresses offers outside radius or stale GPS',async()=>{
 const sql=await read('supabase/migrations/20260927120000_provider_alert_radius_20km.sql')
 assert.match(sql,/create or replace function private\.notify_provider_new_offer/)
 assert.match(sql,/not extensions\.st_dwithin\(v_client_location,v_provider_location,v_alert_radius_m\)/)
 assert.match(sql,/v_provider_location_at < now\(\)-interval '30 seconds'/)
 assert.match(sql,/provider_offer_alert_suppressed/)
 assert.match(sql,/'radio_max_km',20/)
})

test('20km boundary cases follow inclusive business rule',()=>{
 const origin=[-27.5969,-48.5495]
 const cases=[
  [1_000,true],
  [19_900,true],
  [20_000,true],
  [20_100,false],
  [30_000,false],
 ]
 for(const [meters,expected] of cases){
  const distance=haversine(origin,northOf(origin[0],origin[1],meters))
  assert.equal(distance<=20_000,expected,meters+'m boundary')
 }
})

test('arrival geofence remains a separate 200m rule',async()=>{
 const [sql,tracker,arrival]=await Promise.all([
  read('supabase/migrations/20260927120000_provider_alert_radius_20km.sql'),
  read('src/mvp/ProviderLocationTracker.tsx'),
  read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql'),
 ])
 assert.match(sql,/Arrival geofence remains independently fixed at 200 m/)
 assert.match(tracker,/const ARRIVAL_RADIUS_M=200/)
 assert.match(arrival,/if v_distance_m > 200 then/)
})
