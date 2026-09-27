import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('legacy provider location RPC is not executable by app users',async()=>{
 const sql=await read('supabase/migrations/20260927171000_disable_legacy_provider_location_rpc.sql')
 assert.match(sql,/revoke all on function public\.actualizar_ubicacion_y_distancia\(double precision,double precision,uuid\) from public/)
 assert.match(sql,/from anon/)
 assert.match(sql,/from authenticated/)
 assert.match(sql,/grant execute on function public\.actualizar_ubicacion_y_distancia\(double precision,double precision,uuid\) to service_role/)
})

test('provider runtime uses trusted GPS RPCs instead of the legacy location endpoint',async()=>{
 const[tracker,button]=await Promise.all([
  read('src/mvp/ProviderLocationTracker.tsx'),
  read('src/mvp/AppLocationButton.tsx'),
 ])
 assert.match(tracker,/publicar_ubicacion_disponibilidad_proveedor/)
 assert.match(tracker,/publicar_ubicacion_proveedor/)
 assert.match(button,/publicar_ubicacion_disponibilidad_proveedor/)
 assert.doesNotMatch(tracker,/actualizar_ubicacion_y_distancia/)
 assert.doesNotMatch(button,/actualizar_ubicacion_y_distancia/)
})
