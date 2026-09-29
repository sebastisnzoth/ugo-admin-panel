import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('matching RPC cannot be executed anonymously',async()=>{
 const sql=await read('supabase/migrations/20260927170000_matching_rpc_execute_grants.sql')
 assert.match(sql,/revoke all on function public\.iniciar_matching\(uuid\) from public/)
 assert.match(sql,/revoke all on function public\.iniciar_matching\(uuid\) from anon/)
 assert.match(sql,/grant execute on function public\.iniciar_matching\(uuid\) to authenticated/)
 assert.match(sql,/grant execute on function public\.iniciar_matching\(uuid\) to service_role/)
})

test('provider offer feed rejects non-provider authenticated actors inside SECURITY DEFINER RPC',async()=>{
 const sql=await read('supabase/migrations/20260929205900_harden_provider_offer_rpc_cross_role.sql')
 assert.match(sql,/u\.tipo = 'proveedor'/)
 assert.match(sql,/u\.activo = true/)
 assert.match(sql,/raise exception 'No autorizado: sólo proveedores pueden consultar ofertas'/)
 assert.match(sql,/o\.proveedor_id = v_uid/)
 assert.match(sql,/revoke all on function public\.obtener_ofertas_proveedor\(\) from public, anon/)
})
