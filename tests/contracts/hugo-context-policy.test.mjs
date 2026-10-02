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
 assert.match(source,/THIRD_PARTY_PII_KEY/)
 assert.match(source,/nombre\|apellido\|name\|full_name\|contenido\|comentario/)
 assert.match(source,/role==='admin'\|\|role==='superadmin'/)
 assert.match(source,/REDACTED_EMAIL/)
 assert.match(source,/REDACTED_PHONE/)
})

test('legacy text context remains bounded and secret-sanitized for compatibility',async()=>{
 const source=await read('server/hugo/contextPolicy.ts')
 assert.match(source,/const raw=clean\(value,max\)/)
 assert.match(source,/JSON\.parse\(raw\)/)
 assert.match(source,/sanitizeForModel\(raw,Math\.min\(max,12_000\)\)/)
 assert.match(source,/Math\.min\(max,12_000\)/)
 assert.match(source,/redactLegacyPii/)
})


test('structured JSON is parsed before secret redaction so allowlisting cannot be bypassed',async()=>{const source=await read('server/hugo/contextPolicy.ts');const parse=source.indexOf('JSON.parse(raw)'),structuredRedaction=source.indexOf('JSON.stringify(filtered)');assert.ok(parse>=0&&structuredRedaction>parse)})


test('Supabase Edge Hugo runtimes share the same CORS and context boundary',async()=>{
 const[runtime,legacy,shared]=await Promise.all([
  read('supabase/functions/hugo-runtime/index.ts'),
  read('supabase/functions/hugo-chat/index.ts'),
  read('supabase/functions/_shared/hugoPolicy.ts'),
 ])
 for(const source of[runtime,legacy]){
  assert.match(source,/sanitizeHugoEdgeContext/)
  assert.match(source,/hugoEdgeOrigin/)
  assert.match(source,/hugoEdgeCorsHeaders/)
 }
 assert.doesNotMatch(legacy,/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/)
 assert.match(shared,/ALLOWED_ORIGINS/)
 assert.match(shared,/TOP_LEVEL/)
 assert.match(shared,/THIRD_PARTY_PII_KEY/)
})

test('Edge context is filtered after verified role authority',async()=>{
 const runtime=await read('supabase/functions/hugo-runtime/index.ts')
 const auth=runtime.indexOf('const auth=await authorize(req,role)')
 const context=runtime.indexOf('sanitizeHugoEdgeContext(body.context,auth.requestedRole)')
 const model=runtime.indexOf('askModel(message')
 assert.ok(auth>=0&&context>auth&&model>context)
 const legacy=await read('supabase/functions/hugo-chat/index.ts')
 assert.match(legacy,/sanitizeHugoEdgeContext\(context, requestedRole\)/)
 assert.match(legacy,/hugo_prompt_\$\{requestedRole\}/)
})
