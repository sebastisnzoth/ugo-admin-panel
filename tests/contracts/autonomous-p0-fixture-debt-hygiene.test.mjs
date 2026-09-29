import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const sql=await readFile(new URL('../../supabase/migrations/20260929174500_qa_p0_fixture_debt_hygiene.sql',import.meta.url),'utf8')

test('P0 fixture debt cleanup is demo-only and preserves production debt rule',()=>{
 assert.match(sql,/d\.ambiente='demo'/)
 assert.match(sql,/coalesce\(qs\.metadata->>'qa_p0','false'\)='true'/)
 assert.match(sql,/d\.proveedor_id=pid/)
 assert.match(sql,/estado='anulado'/)
 assert.doesNotMatch(sql,/ambiente='real'/)
 assert.match(sql,/P0_MATCHING_FAILED/)
})
