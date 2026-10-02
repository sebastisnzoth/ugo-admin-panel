import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('cross realtime runtime binds GitHub TEST environment secrets',async()=>{
 const yml=await readFile('.github/workflows/cross-realtime-consistency-runtime.yml','utf8')
 const runtime=yml.match(/jobs:\n\s+runtime:[\s\S]*?\n\s+judge:/)?.[0]||''
 assert.match(runtime,/\n\s+environment:\s*test\b/)
 assert.match(runtime,/UGO_TEST_SUPABASE_SERVICE_ROLE_KEY/)
 assert.match(runtime,/UGO_TEST_CLIENT_PASSWORD/)
 assert.match(runtime,/UGO_TEST_PROVIDER_PASSWORD/)
})
