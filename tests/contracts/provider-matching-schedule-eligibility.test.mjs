import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('matching filters providers with the same schedule constraints enforced at acceptance',async()=>{
 const sql=await read('supabase/migrations/20260927165000_provider_matching_schedule_eligibility.sql')
 assert.match(sql,/create or replace function private\.proveedor_puede_recibir_oferta/)
 assert.match(sql,/existing\.estado in \('en_camino','llegado','en_progreso'\)/)
 assert.match(sql,/if v_target_start is null then return false/)
 assert.match(sql,/v_target_start - v_buffer/)
 assert.match(sql,/existing\.programado_para < v_target_end \+ v_buffer/)
})

test('matching applies schedule eligibility to new candidates and stale pending offers',async()=>{
 const sql=await read('supabase/migrations/20260927165000_provider_matching_schedule_eligibility.sql')
 assert.match(sql,/proveedor_puede_recibir_oferta\(o\.proveedor_id,p_servicio_id\)/)
 assert.match(sql,/proveedor_puede_recibir_oferta\(u\.id,p_servicio_id\)/)
 assert.match(sql,/proveedor_bloqueado_por_deuda_ugo\(o\.proveedor_id\)/)
 assert.match(sql,/proveedor_bloqueado_por_deuda_ugo\(u\.id\)/)
})

test('future non-overlapping work remains eligible instead of globally blocking busy providers',async()=>{
 const sql=await read('supabase/migrations/20260927165000_provider_matching_schedule_eligibility.sql')
 assert.doesNotMatch(sql,/return false;\s*--.*any live job/i)
 assert.match(sql,/if v_target_start is null then return false/)
 assert.match(sql,/if exists\([\s\S]*v_target_start < \([\s\S]*return false/)
 assert.match(sql,/return true;/)
})
