import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider multirubro keeps one primary category and active secondary categories',async()=>{
 const sql=await read('supabase/migrations/20260914160000_provider_multicategory_matching.sql')
 assert.match(sql,/create table if not exists public\.proveedor_categorias/)
 assert.match(sql,/primary key \(proveedor_id, categoria_id\)/)
 assert.match(sql,/proveedor_categorias_unica_principal_idx/)
 assert.match(sql,/insert into public\.proveedor_categorias[\s\S]*categoria_principal_id/)
 assert.match(sql,/guardar_categorias_proveedor/)
})

test('automatic and directed matching use the same multirubro eligibility rule',async()=>{
 const sql=await read('supabase/migrations/20260914160000_provider_multicategory_matching.sql')
 const uses=sql.match(/private\.proveedor_trabaja_categoria/g)||[]
 assert.ok(uses.length>=4,'helper must be defined, granted and used by both matching paths')
 assert.match(sql,/pp\.estado_verificacion='verificado'/)
 assert.match(sql,/pp\.disponible=true/)
 assert.match(sql,/pp\.online=true/)
 assert.match(sql,/candidato_tarifa/)
 assert.match(sql,/El proveedor no trabaja en esta categoría/)
})

test('multirubro does not replace the canonical single service assignment',async()=>{
 const sql=await read('supabase/migrations/20260914160000_provider_multicategory_matching.sql')
 assert.doesNotMatch(sql,/alter table public\.servicios[\s\S]*drop column[\s\S]*proveedor_id/i)
 assert.doesNotMatch(sql,/create table if not exists public\.servicios_equipo/i)
})


test('current matching consumes provider selected category ids and debt eligibility',async()=>{
 const sql=await read('supabase/migrations/20260920091500_match_selected_provider_categories.sql')
 assert.match(sql,/create or replace function private\.proveedor_trabaja_categoria/)
 assert.match(sql,/p_categoria_id=any\(coalesce\(u\.categorias_ids,'\{\}'::uuid\[\]\)\)/)
 assert.match(sql,/private\.proveedor_trabaja_categoria\(u\.id,v_servicio\.categoria_id\)/)
 assert.match(sql,/private\.proveedor_bloqueado_por_deuda_ugo\(u\.id\)/)
 assert.match(sql,/create or replace function public\.iniciar_matching_dirigido/)
 assert.match(sql,/private\.proveedor_trabaja_categoria\(p_proveedor_id,v_servicio\.categoria_id\)/)
 assert.match(sql,/private\.proveedor_bloqueado_por_deuda_ugo\(p_proveedor_id\)/)
})
