import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('Hugo chat delegates authentication and sanitization to dedicated boundaries',async()=>{
 const chat=await read('api/hugo/chat.ts')
 assert.match(chat,/authorizeHugo/)
 assert.match(chat,/sanitizeForModel/)
 assert.doesNotMatch(chat,/createClient\(/)
 assert.doesNotMatch(chat,/function bearer\(/)
 assert.doesNotMatch(chat,/function sanitizeForModel\(/)
})

test('Hugo auth verifies Supabase user before reading profile authority',async()=>{
 const auth=await read('server/hugo/auth.ts')
 assert.match(auth,/auth\.getUser\(token\)/)
 assert.match(auth,/from\('usuarios'\).*select\('tipo,activo'\)/s)
 assert.match(auth,/decideHugoAuthority/)
 assert.match(auth,/AUTH_REQUIRED/)
 assert.match(auth,/ROLE_MISMATCH|decision\.code/)
})

test('Hugo model sanitizer redacts bearer tokens, JWTs, API secrets and large blobs',async()=>{
 const security=await read('server/hugo/security.ts')
 for(const marker of['Bearer [REDACTED]','[REDACTED_JWT]','[REDACTED_SECRET]','[REDACTED_BLOB]'])assert.ok(security.includes(marker))
 assert.match(security,/password\|passwd/)
 assert.match(security,/authorization/)
})

test('Authority policy keeps superadmin isolated from lower roles',async()=>{
 const authority=await read('server/hugo/authority.ts')
 assert.match(authority,/requestedRole==='superadmin'.*actual==='superadmin'/s)
 assert.match(authority,/requestedRole==='admin'.*actual==='admin'\|\|actual==='superadmin'/s)
 assert.match(authority,/if\(!active\).*INACTIVE_PROFILE/s)
})
