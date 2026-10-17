import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source=await readFile(new URL('../../supabase/migrations/20261017073000_provider_calendar_matching_gate.sql',import.meta.url),'utf8')
test('schedule dispatch gate checks saved days, local hours and off dates',()=>{
 assert.match(source,/America\/Sao_Paulo/)
 assert.match(source,/extract\(isodow from local_start\)/)
 assert.match(source,/schedule->'days' @>/)
 assert.match(source,/schedule->'off' \? to_char/)
 assert.match(source,/local_start::date<>local_end::date/)
 assert.match(source,/start_minutes>=end_minutes/)
})
test('eligibility and acceptance both enforce provider calendar',()=>{
 assert.match(source,/private\.proveedor_puede_recibir_oferta/)
 assert.match(source,/private\.aceptar_oferta_impl/)
 assert.match(source,/proveedor_horario_permite\(p_proveedor_id,coalesce\(v_target_start,now\(\)\),v_target_duration\)/)
 assert.match(source,/proveedor_horario_permite\(v_uid,coalesce\(v_target_start,now\(\)\),v_target_duration\)/)
})
