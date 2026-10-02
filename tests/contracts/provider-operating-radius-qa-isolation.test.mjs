import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('provider operating radius QA uses a future scheduled service so active immediate fixtures cannot block it',async()=>{
 const sql=await readFile('supabase/migrations/20261002202000_fix_provider_operating_radius_qa_fixture_isolation.sql','utf8')
 assert.match(sql,/programado_para/)
 assert.match(sql,/now\(\)\+interval '1 day'/)
 assert.match(sql,/autonomous_qa_provider_operating_radius/)
})
