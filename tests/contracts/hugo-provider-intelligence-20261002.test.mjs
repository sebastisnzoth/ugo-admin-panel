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

test('provider Hugo uses structured JSON actions and preserves app-side authority',async()=>{
 const edge=await read('supabase/functions/hugo-runtime/index.ts')
 const client=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(edge,/provider_action/)
 assert.match(edge,/safeProviderAction/)
 assert.match(edge,/providerMode=role==='provider'/)
 assert.match(edge,/structuredMode=adminMode\|\|providerMode/)
 assert.match(client,/executeAiAction/)
 assert.match(client,/data\.setOnline\(true\)/)
 assert.match(client,/flow\.actions\.acceptOpportunity/)
 assert.match(client,/data\.advance\(status\)/)
 assert.match(client,/La acción propuesta por Hugo no está permitida/)
})

test('provider AI action ids must be UUIDs and allowed status values are explicit',async()=>{
 const edge=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(edge,/\^\[0-9a-f-\]\{36\}\$\/i\.test\(serviceId\)/)
 assert.match(edge,/\['en_camino','llegado','en_progreso','esperando_aprobacion'\]\.includes\(status\)/)
})

test('Hugo Live token remains constrained to the configured audio model',async()=>{
 const edge=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(edge,/liveConnectConstraints/)
 assert.match(edge,/responseModalities:\['AUDIO'\]/)
 assert.match(edge,/ugo-admin-panel\.vercel\.app/)
 assert.doesNotMatch(edge,/const anonKey=/)
})
