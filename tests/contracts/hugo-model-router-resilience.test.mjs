import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const router=await readFile(new URL('../../server/hugo/modelRouter.ts',import.meta.url),'utf8')
const chat=await readFile(new URL('../../api/hugo/chat.ts',import.meta.url),'utf8')
test('Hugo routes retryable Gemini failures to bounded OpenRouter fallback',()=>{
 assert.match(router,/GEMINI_TIMEOUT_MS/)
 assert.match(router,/OPENROUTER_TIMEOUT_MS/)
 assert.match(router,/retryableStatus/)
 assert.match(router,/callOpenRouter/)
 assert.match(router,/HUGO_MODEL_FALLBACK_EXHAUSTED/)
 assert.match(router,/fallback_used:true/)
})
test('Hugo model telemetry is correlation-safe and does not log prompts or secrets',()=>{
 assert.match(router,/crypto\.randomUUID\(\)/)
 assert.match(router,/event:'hugo_model_route'/)
 assert.match(router,/primary_error_code/)
 assert.doesNotMatch(router,/telemetry\(\{[^}]*message/)
 assert.doesNotMatch(router,/telemetry\(\{[^}]*system/)
})
test('chat API uses the bounded model router and returns route metadata',()=>{
 assert.match(chat,/askHugoModel/)
 assert.match(chat,/model_provider:result\.provider/)
 assert.match(chat,/fallback_used:result\.fallback_used/)
 assert.match(chat,/correlation_id:result\.correlation_id/)
})
