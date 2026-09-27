import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../../'+p,import.meta.url),'utf8')

test('canonical Client mounts the real Hugo Gemini Live bridge exactly once',async()=>{
 const root=await read('src/features/client/ClientRoot.tsx')
 assert.match(root,/import\{ClientHugoBridge\}from'\.\/hugo\/ClientHugoBridge'/)
 assert.equal((root.match(/<ClientHugoBridge\/>/g)||[]).length,1)
 const bridge=await read('src/features/client/hugo/ClientHugoBridge.tsx')
 assert.match(bridge,/ClientVoiceHugoDock/)
 assert.match(bridge,/useRoleSession\('client'\)/)
})

test('Hugo client request remains real and refuses fake GPS fallback',async()=>{
 const dock=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx')
 assert.match(dock,/navigator\.geolocation\.getCurrentPosition/)
 assert.match(dock,/GPS_UNAVAILABLE/)
 assert.match(dock,/source:'hugo-conversational'/)
 assert.match(dock,/getDispatchProvider\(\)/)
 assert.doesNotMatch(dock,/pickupFallback:'random'/)
})
