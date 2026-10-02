import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo context is filtered after verified authority and before prompt construction',async()=>{
 const chat=await read('api/hugo/chat.ts')
 const auth=chat.indexOf('authorizeHugo(req,body)')
 const context=chat.indexOf('sanitizeHugoContextForRole(body.context,authority.requestedRole)')
 const prompt=chat.indexOf('buildHugoPrompt')
 assert.ok(auth>=0&&context>auth&&prompt>context)
})

test('role context policy has explicit top-level allowlists',async()=>{
 const source=await read('server/hugo/contextPolicy.ts')
 assert.match(source,/client:new Set/)
 assert.match(source,/provider:new Set/)
 assert.match(source,/admin:new Set/)
 assert.match(source,/superadmin:new Set/)
 assert.match(source,/if\(!allowed\.has\(key\)\)continue/)
})

test('context policy removes secrets contacts and exact admin map coordinates',async()=>{
 const source=await read('server/hugo/contextPolicy.ts')
 assert.match(source,/NEVER_KEY/)
 assert.match(source,/CONTACT_KEY/)
 assert.match(source,/EXACT_LOCATION_KEY/)
 assert.match(source,/role==='admin'\|\|role==='superadmin'/)
 assert.match(source,/REDACTED_EMAIL/)
 assert.match(source,/REDACTED_PHONE/)
})

test('legacy text context remains bounded and secret-sanitized for compatibility',async()=>{
 const source=await read('server/hugo/contextPolicy.ts')
 assert.match(source,/sanitizeForModel\(value,max\)/)
 assert.match(source,/Math\.min\(max,12_000\)/)
 assert.match(source,/redactLegacyPii/)
})
