import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('P0.1 migration gives GPS its own freshness clock and rejects invalid device positions',async()=>{
 const sql=await read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql')
 assert.match(sql,/add column if not exists ubicacion_updated_at timestamptz/i)
 assert.match(sql,/add column if not exists ubicacion_accuracy_m double precision/i)
 assert.match(sql,/create or replace function public\.publicar_ubicacion_proveedor/i)
 assert.match(sql,/p_captured_at timestamptz/i)
 assert.match(sql,/p_accuracy_m double precision/i)
 assert.match(sql,/v_age_ms < -5000 or v_age_ms > 30000/i)
 assert.match(sql,/p_accuracy_m <= 0 or p_accuracy_m > 250/i)
 assert.match(sql,/abs\(p_lat\) < 0\.0001 and abs\(p_lng\) < 0\.0001/i)
 assert.match(sql,/s\.proveedor_id=v_uid/i)
 assert.match(sql,/s\.estado in \('en_camino','llegado'\)/i)
})

test('arrival is a dedicated server-side 200m gate with fresh persisted GPS',async()=>{
 const sql=await read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql')
 assert.match(sql,/create or replace function public\.marcar_llegada_proveedor/i)
 assert.match(sql,/select \* into v_servicio[\s\S]*for update/i)
 assert.match(sql,/v_servicio\.proveedor_id is distinct from v_uid/i)
 assert.match(sql,/v_servicio\.estado='llegado'/i)
 assert.match(sql,/'idempotent',true/i)
 assert.match(sql,/v_servicio\.estado <> 'en_camino'/i)
 assert.match(sql,/v_location_at is null/i)
 assert.match(sql,/v_age_ms < -5000 or v_age_ms > 30000/i)
 assert.match(sql,/v_accuracy_m is null or v_accuracy_m <= 0 or v_accuracy_m > 250/i)
 assert.match(sql,/client_location_unavailable/i)
 assert.match(sql,/v_distance_m > 200/i)
 assert.match(sql,/outside_geofence/i)
 assert.match(sql,/set_config\('ugo\.arrival_validated_service'/i)
})

test('all en_camino to llegado updates are blocked unless the dedicated backend gate validated that service',async()=>{
 const sql=await read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql')
 assert.match(sql,/create or replace function private\.enforce_validated_provider_arrival/i)
 assert.match(sql,/old\.estado='en_camino'/i)
 assert.match(sql,/new\.estado='llegado'/i)
 assert.match(sql,/current_setting\('ugo\.arrival_validated_service',true\)/i)
 assert.match(sql,/before update of estado on public\.servicios/i)
})

test('provider UI publishes device GPS before calling dedicated arrival RPC',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 const publishIndex=service.indexOf("rpc('publicar_ubicacion_proveedor'")
 const arrivalIndex=service.indexOf("rpc('marcar_llegada_proveedor'")
 assert.ok(publishIndex>=0)
 assert.ok(arrivalIndex>publishIndex)
 assert.match(service,/p_captured_at:capturedAt/)
 assert.match(service,/p_accuracy_m:accuracy/)
 assert.doesNotMatch(service,/if\(state==='llegado'\)await publishProviderLocation/)
})

test('live en-route tracker sends captured timestamp and accuracy through the hardened publication RPC',async()=>{
 const tracker=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(tracker,/serviceId[\s\S]*rpc\('publicar_ubicacion_proveedor'/)
 assert.match(tracker,/p_captured_at:capturedAt/)
 assert.match(tracker,/p_accuracy_m:accuracy/)
 assert.match(tracker,/MAX_POSITION_AGE_MS=30_000/)
 assert.match(tracker,/MAX_ACCEPTABLE_ACCURACY_M=250/)
})

test('tracking freshness is sourced from ubicacion_updated_at rather than generic profile updated_at',async()=>{
 const sql=await read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql')
 assert.match(sql,/pp\.ubicacion_updated_at/)
 assert.doesNotMatch(sql,/pp\.updated_at\s*\n\s*from public\.perfiles_proveedor/)
})


test('direct or legacy provider-location writes cannot preserve trusted arrival freshness',async()=>{
 const sql=await read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql')
 assert.match(sql,/create or replace function private\.guard_provider_location_trust[\s\S]*as \$\$/i)
 assert.match(sql,/current_setting\('ugo\.trusted_provider_location',true\)/i)
 assert.match(sql,/new\.ubicacion_updated_at := null/i)
 assert.match(sql,/new\.ubicacion_accuracy_m := null/i)
 assert.match(sql,/before insert on public\.perfiles_proveedor/i)
 assert.match(sql,/before update of ubicacion,ubicacion_updated_at,ubicacion_accuracy_m on public\.perfiles_proveedor/i)
 assert.match(sql,/set_config\('ugo\.trusted_provider_location',v_uid::text,true\)/i)
 assert.match(sql,/set_config\('ugo\.trusted_provider_location','',true\)/i)
})

test('trusted GPS metadata is scoped to the authenticated provider publication transaction',async()=>{
 const sql=await read('supabase/migrations/20260924162000_provider_arrival_gps_gate.sql')
 const publishStart=sql.indexOf('create or replace function public.publicar_ubicacion_proveedor')
 const trackingStart=sql.indexOf('create or replace function public.obtener_tracking_servicio_cliente')
 const publish=sql.slice(publishStart,trackingStart)
 assert.ok(publishStart>=0&&trackingStart>publishStart)
 assert.match(publish,/v_uid uuid := auth\.uid\(\)/)
 assert.match(publish,/s\.proveedor_id=v_uid/)
 assert.match(publish,/set_config\('ugo\.trusted_provider_location',v_uid::text,true\)/)
 assert.match(publish,/where usuario_id=v_uid/)
})
