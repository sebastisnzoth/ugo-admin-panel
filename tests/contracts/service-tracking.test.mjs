import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('tracking RPCs are scoped to the authenticated service participants',async()=>{
 const sql=await read('supabase/migrations/20260914234234_provider_client_tracking_rpcs.sql')
 assert.match(sql,/create or replace function public\.actualizar_ubicacion_y_distancia/i)
 assert.match(sql,/u\.tipo='proveedor'/i)
 assert.match(sql,/s\.proveedor_id=v_uid/i)
 assert.match(sql,/s\.estado in \('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'\)/i)
 assert.match(sql,/create or replace function public\.obtener_tracking_servicio_cliente/i)
 assert.match(sql,/s\.cliente_id=v_uid/i)
 assert.match(sql,/revoke all on function public\.actualizar_ubicacion_y_distancia/i)
 assert.match(sql,/revoke all on function public\.obtener_tracking_servicio_cliente/i)
 assert.match(sql,/grant execute on function public\.actualizar_ubicacion_y_distancia[\s\S]*to authenticated/i)
 assert.match(sql,/grant execute on function public\.obtener_tracking_servicio_cliente[\s\S]*to authenticated/i)
})

test('provider and client tracking UI consume the canonical backend RPCs',async()=>{
 const provider=await read('src/mvp/ProviderLocationTracker.tsx')
 const map=await read('src/features/client/order/ClientActiveMap.tsx')
 assert.match(provider,/rpc\('actualizar_ubicacion_y_distancia'/)
 assert.match(provider,/p_servicio_id:serviceId/)
 assert.match(map,/rpc\('obtener_tracking_servicio_cliente'/)
 assert.match(map,/p_servicio_id:serviceId/)
})

test('tracking uses canonical geography coordinates and client location fallback',async()=>{
 const sql=await read('supabase/migrations/20260914234234_provider_client_tracking_rpcs.sql')
 assert.match(sql,/st_makepoint\(p_lng,p_lat\)/i)
 assert.match(sql,/coalesce\(s\.ubicacion_cliente,pc\.ubicacion\)/i)
 assert.match(sql,/st_distance/i)
})
