import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo sanitizes secrets before model-bound client/admin payloads',async()=>{
 const api=await read('api/hugo/chat.ts')
 assert.match(api,/function sanitizeForModel/)
 assert.match(api,/Bearer \[REDACTED\]/)
 assert.match(api,/\[REDACTED_JWT\]/)
 assert.match(api,/\[REDACTED_SECRET\]/)
 assert.match(api,/safeHistory/)
 assert.match(api,/safeMessage/)
 assert.match(api,/safeSystem/)
 assert.match(api,/safeText/)
})

test('Hugo edge function sanitizes context, history and user message before external model call',async()=>{
 const edge=await read('supabase/functions/hugo-chat/index.ts')
 assert.match(edge,/function sanitizeForModel/)
 assert.match(edge,/safeContext/)
 assert.match(edge,/sanitizeForModel\(record\.content,1200\)/)
 assert.match(edge,/sanitizeForModel\(message,1800\)/)
 assert.match(edge,/systemPrompt = sanitizeForModel/)
})

test('Hugo privacy stays behind authenticated role authority',async()=>{
 const[api,authority,live]=await Promise.all([
  read('api/hugo/chat.ts'),
  read('src/server/hugo/authority.ts'),
  read('api/test.ts'),
 ])
 assert.match(api,/authorizeHugo\(req,body\)/)
 assert.match(api,/auth\.getUser\(token\)/)
 assert.match(authority,/ROLE_MISMATCH/)
 assert.match(authority,/INACTIVE_PROFILE/)
 assert.match(live,/voiceRole==='provider'\?profileRole==='proveedor':profileRole==='cliente'/)
})
