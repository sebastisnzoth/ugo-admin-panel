import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('D14 distinguishes machine-verifiable uploaded media from human-only proof',async()=>{
 const sql=await readFile(new URL('../../supabase/migrations/20260929183500_d14_uploaded_media_machine_evidence.sql',import.meta.url),'utf8')
 assert.match(sql,/physical-gps-device/)
 assert.match(sql,/real-customer-acceptance/)
 const guard=sql.match(/coverage_key in\(([^)]+)\)/i)?.[1]||''
 assert.doesNotMatch(guard,/uploaded-media-bytes/)
 assert.match(sql,/D14_FAKE_PHYSICAL_OR_HUMAN_COVERAGE_DETECTED/)
})
