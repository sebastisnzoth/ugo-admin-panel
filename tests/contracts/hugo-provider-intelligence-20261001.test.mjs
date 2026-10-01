import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider browser voice keeps recent conversational memory and rich live context',async()=>{
 const src=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(src,/useRef<Array<\{role:'user'\|'assistant';content:string\}>>/)
 assert.match(src,/providerVoiceContext\(data,flow\.screen\)/)
 assert.match(src,/history=conversation\.current/)
 assert.match(src,/history\}\)\}\)/)
 assert.match(src,/remember\('user',source\)/)
 assert.match(src,/remember\('assistant',reply\)/)
})

test('provider Hugo system prompt reasons from real operational context without claiming fake actions',async()=>{
 const src=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(src,/copiloto operativo del proveedor/)
 assert.match(src,/Entendé referencias de contexto/)
 assert.match(src,/próximo paso permitido/)
 assert.match(src,/Nunca afirmes que cambiaste Online\/Offline/)
})

test('provider intelligence patch preserves Live token hardening in TEST runtime source',async()=>{
 const src=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(src,/liveConnectConstraints/)
 assert.match(src,/responseModalities:\['AUDIO'\]/)
 assert.match(src,/ugo-admin-panel\.vercel\.app/)
})


test('provider AI may emit only validated structured actions and client executes through existing app actions',async()=>{
 const edge=await read('supabase/functions/hugo-runtime/index.ts')
 const client=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(edge,/safeProviderAction/)
 assert.match(edge,/provider_action/)
 assert.match(edge,/set_online/)
 assert.match(edge,/accept_job/)
 assert.match(edge,/update_service_status/)
 assert.match(client,/executeAiAction/)
 assert.match(client,/data\.setOnline\(true\)/)
 assert.match(client,/flow\.actions\.acceptOpportunity/)
 assert.match(client,/data\.advance\(status\)/)
 assert.match(client,/La acción propuesta por Hugo no está permitida/)
})
