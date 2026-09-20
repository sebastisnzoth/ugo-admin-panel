import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('direct provider assignment cannot remain buscando or ofrecido',async()=>{
 const sql=await read('supabase/migrations/20260920090000_direct_assignment_realtime_convergence.sql')
 assert.match(sql,/normalize_service_provider_assignment/)
 assert.match(sql,/new\.estado::text in \('buscando','ofrecido'\)/)
 assert.match(sql,/new\.estado='asignado'::public\.servicio_estado/)
 assert.match(sql,/new\.aceptado_at=coalesce\(new\.aceptado_at,now\(\)\)/)
 assert.match(sql,/close_pending_offers_after_assignment/)
 assert.match(sql,/estado=case when proveedor_id=new\.proveedor_id then 'aceptada'/)
 assert.match(sql,/where proveedor_id is not null[\s\S]*estado::text in \('buscando','ofrecido'\)/)
})

test('direct assignment notifies both client and externally assigned provider',async()=>{
 const sql=await read('supabase/migrations/20260920090000_direct_assignment_realtime_convergence.sql')
 assert.match(sql,/'proveedor_asignado'/)
 assert.match(sql,/'trabajo_asignado'/)
 assert.match(sql,/auth\.uid\(\) is distinct from new\.proveedor_id/)
 assert.match(sql,/'Nuevo trabajo asignado'/)
})

test('client home never labels a row with provider id as searching',async()=>{
 const home=await read('src/mvp/client/ClientHomeScreen.tsx')
 assert.match(home,/order\.proveedor_id\?'Profesional asignado'/)
})
