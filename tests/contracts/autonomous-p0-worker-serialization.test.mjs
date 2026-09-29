import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('P0 TEST harness serializes the shared provider fixture',async()=>{
 const sql=await read('supabase/migrations/20260929174700_qa_p0_worker_serialization_fix.sql')
 assert.match(sql,/pg_advisory_xact_lock/)
 assert.match(sql,/ugo-test-p0-provider-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/)
 assert.match(sql,/grant execute on function public\.autonomous_qa_run_p0_test_service\(\) to service_role/i)
 assert.doesNotMatch(sql,/grant execute .* to (anon|authenticated)/i)
})

test('P0 TEST harness fails closed before matching when fixture is ineligible',async()=>{
 const sql=await read('supabase/migrations/20260929175500_qa_p0_matching_precondition.sql')
 assert.match(sql,/proveedor_puede_recibir_oferta\(pid,sid\)/)
 assert.match(sql,/P0_PROVIDER_INELIGIBLE_BEFORE_MATCHING/)
 assert.match(sql,/P0_MATCHING_FAILED/)
})
