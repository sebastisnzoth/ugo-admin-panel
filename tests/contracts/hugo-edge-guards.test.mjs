import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Edge request schema rejects unknown roles, bad types and oversized history',async()=>{
 const source=await read('supabase/functions/_shared/hugoRequest.ts')
 assert.match(source,/ROLES=new Set<HugoEdgeRole>\(\['client','provider','admin','superadmin'\]\)/)
 assert.match(source,/Rol Hugo no válido/)
 assert.match(source,/voice_live_token debe ser booleano/)
 assert.match(source,/context',120_000/)
 assert.match(source,/history\.length>32/)
 assert.match(source,/Cada elemento de history debe ser un objeto/)
})

test('Edge rate limiter is bounded and configurable by IP and authenticated user',async()=>{
 const source=await read('supabase/functions/_shared/hugoRateLimit.ts')
 assert.match(source,/WINDOW_MS=60_000/)
 assert.match(source,/MAX_BUCKETS=2_048/)
 assert.match(source,/HUGO_RATE_LIMIT_IP_PER_MINUTE/)
 assert.match(source,/HUGO_RATE_LIMIT_USER_PER_MINUTE/)
 assert.match(source,/HUGO_LIVE_RATE_LIMIT_USER_PER_MINUTE/)
 assert.match(source,/status:429/)
 assert.match(source,/code:'HUGO_RATE_LIMITED'/)
 assert.match(source,/retryAfter/)
})

test('hugo-runtime orders guards before expensive model or token work',async()=>{
 const source=await read('supabase/functions/hugo-runtime/index.ts')
 const ip=source.indexOf('enforceHugoEdgeIpRateLimit(req)')
 const parse=source.indexOf("parseHugoEdgeBody(raw,'client')")
 const auth=source.indexOf('const auth=await authorize(req,role)')
 const user=source.indexOf('enforceHugoEdgeUserRateLimit(auth.user.id')
 const live=source.indexOf('return json(await createLiveToken()')
 const model=source.indexOf('const result=await askModel(message')
 assert.ok(ip>=0&&parse>ip&&auth>parse&&user>auth&&live>user&&model>user)
 assert.match(source,/Retry-After/)
})

test('legacy hugo-chat uses the same schema and rate-limit boundaries',async()=>{
 const source=await read('supabase/functions/hugo-chat/index.ts')
 const ip=source.indexOf('enforceHugoEdgeIpRateLimit(req)')
 const parse=source.indexOf("parseHugoEdgeBody(raw,'admin')")
 const auth=source.indexOf('sb.auth.getUser(token)')
 const user=source.indexOf("enforceHugoEdgeUserRateLimit(authData.user.id,'chat')")
 const model=source.indexOf("fetch('https://api.anthropic.com")
 assert.ok(ip>=0&&parse>ip&&auth>parse&&user>auth&&model>user)
 assert.match(source,/Retry-After/)
 assert.match(source,/INVALID_REQUEST/)
})

test('Edge role defaults preserve runtime contracts while invalid roles fail closed',async()=>{
 const runtime=await read('supabase/functions/hugo-runtime/index.ts')
 const legacy=await read('supabase/functions/hugo-chat/index.ts')
 assert.match(runtime,/parseHugoEdgeBody\(raw,'client'\)/)
 assert.match(legacy,/parseHugoEdgeBody\(raw,'admin'\)/)
})
