import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo sanitizes secrets through the dedicated model-boundary module',async()=>{
 const[api,security]=await Promise.all([read('api/hugo/chat.ts'),read('server/hugo/security.ts')])
 assert.match(api,/sanitizeForModel/)
 assert.match(api,/safeHistory/)
 assert.match(api,/safeMessage/)
 assert.match(api,/safeSystem/)
 assert.match(api,/safeText/)
 assert.match(security,/Bearer \[REDACTED\]/)
 assert.match(security,/\[REDACTED_JWT\]/)
 assert.match(security,/\[REDACTED_SECRET\]/)
 assert.match(security,/\[REDACTED_BLOB\]/)
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
 const[api,auth,authority,live]=await Promise.all([
  read('api/hugo/chat.ts'),
  read('server/hugo/auth.ts'),
  read('server/hugo/authority.ts'),
  read('api/test.ts'),
 ])
 assert.match(api,/authorizeHugo\(req,body\)/)
 assert.match(auth,/auth\.getUser\(token\)/)
 assert.match(auth,/from\('usuarios'\)\.select\('tipo,activo'\)/)
 assert.match(auth,/decideHugoAuthority/)
 assert.match(authority,/ROLE_MISMATCH/)
 assert.match(authority,/INACTIVE_PROFILE/)
 assert.match(live,/voiceRole==='provider'\?profileRole==='proveedor':profileRole==='cliente'/)
})
