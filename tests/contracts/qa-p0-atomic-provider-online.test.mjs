import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20261002235900_fix_qa_p0_atomic_provider_online.sql','utf8')

test('P0 QA fixture atomically activates the provider before matching',()=>{
  assert.match(sql,/autonomous_qa_run_p0_test_service/)
  assert.match(sql,/perform public\.activar_disponibilidad_proveedor\(lat,lng,now\(\),10\)/)
  assert.doesNotMatch(sql,/perform public\.publicar_ubicacion_disponibilidad_proveedor\(lat,lng,now\(\),10\)/)
  assert.match(sql,/revoke all on function public\.autonomous_qa_run_p0_test_service\(\) from public,anon,authenticated/)
  assert.match(sql,/grant execute on function public\.autonomous_qa_run_p0_test_service\(\) to service_role/)
})
