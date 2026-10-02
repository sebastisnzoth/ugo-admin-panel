import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider browser voice keeps recent conversational memory and rich live context',async()=>{
 const src=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(src,/useRef<Array<\{role:'user'\|'assistant';content:string\}>>/)
 assert.match(src,/providerVoiceContext\(data,flow\.screen\)/)
 assert.match(src,/history=conversation\.current/)
 assert.match(src,/remember\('user',source\)/)
 assert.match(src,/remember\('assistant',spoken\)/)
})

test('provider model output can navigate but cannot authorize mutations',async()=>{
 const edge=await read('supabase/functions/hugo-runtime/index.ts')
 const client=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(edge,/provider_action/)
 assert.match(edge,/function safeProviderAction/)
 assert.match(edge,/if\(type!=='navigate'\)return null/)
 assert.match(edge,/El modelo no puede autorizar cambios de trabajo/)
 const start=client.indexOf('const executeAiAction'),end=client.indexOf(' const speak=',start),ai=client.slice(start,end)
 assert.match(ai,/type==='navigate'/)
 assert.match(ai,/Por seguridad, Hugo no ejecuta cambios de trabajo desde una respuesta de IA/)
 assert.doesNotMatch(ai,/data\.setOnline/)
 assert.doesNotMatch(ai,/acceptOpportunity/)
 assert.doesNotMatch(ai,/rejectOpportunity/)
 assert.doesNotMatch(ai,/data\.advance/)
})

test('deterministic provider commands still own explicit mutations and lifecycle guards',async()=>{
 const direct=await read('src/features/provider/voice/providerVoiceCommands.ts')
 assert.match(direct,/data\.toggleOnline\(\)/)
 assert.match(direct,/flow\.acceptOpportunity/)
 assert.match(direct,/flow\.rejectOpportunity/)
 assert.match(direct,/data\.advance\('en_camino'\)/)
 assert.match(direct,/data\.advance\('llegado'\)/)
})

test('Hugo Live token remains constrained to the configured audio model',async()=>{
 const[edge,policy]=await Promise.all([read('supabase/functions/hugo-runtime/index.ts'),read('supabase/functions/_shared/hugoPolicy.ts')])
 assert.match(edge,/liveConnectConstraints/)
 assert.match(edge,/responseModalities:\['AUDIO'\]/)
 assert.match(edge,/hugoEdgeOrigin/)
 assert.match(policy,/ugo-admin-panel\.vercel\.app/)
 assert.doesNotMatch(edge,/const anonKey=/)
})
