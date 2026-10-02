import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo model router keeps Gemini primary and OpenRouter as server-side fallback',async()=>{
 const src=await read('server/hugo/modelRouter.ts')
 assert.match(src,/provider:'gemini'\|'openrouter'/)
 assert.match(src,/OPENROUTER_API_KEY/)
 assert.match(src,/\/chat\/completions/)
 assert.match(src,/route:'fallback'/)
 assert.match(src,/fallback_used:true/)
})

test('Gemini Live failure degrades to browser speech instead of killing Hugo',async()=>{
 const src=await read('src/lib/browserVoiceBridge.ts')
 assert.match(src,/fallbackEligible&&startFallback\(\)/)
 assert.match(src,/gemini-live-start-fallback/)
 assert.match(src,/gemini-live-fallback/)
})

test('provider browser speech can continue through the authenticated Hugo model router',async()=>{
 const src=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(src,/engine==='browser-speech'/)
 assert.match(src,/fetch\(getHugoRuntimeUrl\('\/api\/hugo\/chat'\)/)
 assert.match(src,/role:'provider'/)
 assert.match(src,/Authorization:'Bearer '\+session\.access_token/)
})

test('Hugo API keeps provider fallback conversational and non-mutating',async()=>{
 const src=await read('api/hugo/chat.ts')
 assert.match(src,/providerMode=requestedRole==='provider'/)
 assert.match(src,/En este fallback conversacional no ejecutes cambios por tu cuenta/)
 assert.match(src,/providerMode\?providerSystem/)
 assert.match(src,/clientMode\|\|providerMode\?null:parseHugoUiAction/)
})

test('GitHub Pages TEST preview uses Supabase Edge without exposing OpenRouter',async()=>{
 const[workflow,env,chat,cors,testApi]=await Promise.all([
  read('.github/workflows/github-pages.yml'),
  read('.env.example'),
  read('api/hugo/chat.ts'),
  read('server/hugo/cors.ts'),
  read('api/test.ts'),
 ])
 assert.match(workflow,/VITE_HUGO_EDGE_URL: https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co\/functions\/v1\/hugo-runtime/)
 assert.doesNotMatch(workflow,/netlify/i)
 assert.match(workflow,/--base=\/ugo-admin-panel\/app\//)
 assert.match(workflow,/cp -a dist\/\. _site\/app\//)
 assert.match(env,/OPENROUTER_API_KEY=/)
 assert.doesNotMatch(env,/VITE_OPENROUTER_API_KEY=/)
 assert.match(cors,/https:\/\/sebastisnzoth\.github\.io/)
 assert.match(testApi,/https:\/\/sebastisnzoth\.github\.io/)
 assert.match(chat,/authorization, content-type/)
 assert.match(testApi,/authorization, content-type/)
 const edge=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(edge,/OPENROUTER_API_KEY/)
 assert.match(edge,/gemini-3\.8-live/)
 assert.match(edge,/El rol de la sesión no coincide/)
})
