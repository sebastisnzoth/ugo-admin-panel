import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('model runtime service role has only required route/metrics grants',async()=>{
 const sql=await read('supabase/migrations/20260929173500_autonomous_model_runtime_service_grants.sql')
 assert.match(sql,/grant select on public\.autonomous_model_routes to service_role/i)
 assert.match(sql,/grant select,insert on public\.autonomous_model_metrics to service_role/i)
 assert.doesNotMatch(sql,/to (anon|authenticated)/i)
})

test('agent consultation executes Gemini primary and OpenRouter fallback',async()=>{
 const api=await read('api/test.ts')
 assert.match(api,/\['gemini','openrouter'\]\.includes\(x\.provider\)/)
 assert.match(api,/candidate\.provider==='gemini'/)
 assert.match(api,/GEMINI_API_KEY/)
 assert.match(api,/OPENROUTER_API_KEY/)
 assert.match(api,/autonomous_model_metrics/)
 assert.match(api,/MODEL_FALLBACK_EXHAUSTED/)
})
