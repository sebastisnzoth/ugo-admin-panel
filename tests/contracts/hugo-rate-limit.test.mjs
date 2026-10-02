import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo applies IP rate limiting before request parsing and auth',async()=>{
 const chat=await read('api/hugo/chat.ts')
 const ip=chat.indexOf('enforceHugoIpRateLimit(req)')
 const parse=chat.indexOf('parseHugoRequestBody(req.body)')
 const auth=chat.indexOf('authorizeHugo(req,body)')
 assert.ok(ip>=0&&parse>ip&&auth>parse)
})

test('Hugo applies authenticated user rate limiting before TTS or model calls',async()=>{
 const chat=await read('api/hugo/chat.ts')
 const user=chat.indexOf('enforceHugoUserRateLimit')
 const tts=chat.indexOf('askHugoTts')
 const model=chat.indexOf('askHugoText(prompt')
 assert.ok(user>=0&&tts>user&&model>user)
 assert.match(chat,/body\.tts===true\?'tts':'chat'/)
})

test('Hugo rate limiter has bounded windows, configurable limits and bounded memory',async()=>{
 const source=await read('server/hugo/rateLimit.ts')
 assert.match(source,/WINDOW_MS=60_000/)
 assert.match(source,/MAX_BUCKETS=2_048/)
 assert.match(source,/HUGO_RATE_LIMIT_IP_PER_MINUTE/)
 assert.match(source,/HUGO_RATE_LIMIT_USER_PER_MINUTE/)
 assert.match(source,/HUGO_TTS_RATE_LIMIT_USER_PER_MINUTE/)
 assert.match(source,/prune\(now\)/)
})

test('Hugo rate limiting returns HTTP 429 semantics with Retry-After',async()=>{
 const[rate,chat]=await Promise.all([read('server/hugo/rateLimit.ts'),read('api/hugo/chat.ts')])
 assert.match(rate,/status:429/)
 assert.match(rate,/code:'HUGO_RATE_LIMITED'/)
 assert.match(rate,/retryAfter/)
 assert.match(chat,/if\(info\.retryAfter\)res\.setHeader\('Retry-After'/)
 assert.match(chat,/status===429/)
})
