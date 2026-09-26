import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const contract=await readFile(new URL('../../src/features/hugo/core/hugoContract.ts',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')

test('Hugo shared contract keeps role actions bounded',()=>{
 assert.match(contract,/CLIENT_ACTIONS=new Set/)
 assert.match(contract,/PROVIDER_ACTIONS=new Set/)
 assert.match(contract,/ADMIN_ACTIONS=new Set/)
 assert.match(contract,/isHugoActionAllowed/)
 assert.match(bridge,/ACTION_NOT_ALLOWED/)
 assert.match(bridge,/isHugoActionAllowed\(role,name\)/)
})

test('Hugo Live instruction follows ES or pt-BR without changing business codes',()=>{
 assert.match(contract,/HugoLocale='es-AR'\|'pt-BR'/)
 assert.match(contract,/português brasileiro/)
 assert.match(contract,/español rioplatense/)
 assert.match(contract,/currentHugoLocale/)
 assert.match(bridge,/hugoSystemInstruction\(role,locale\)/)
})

test('Hugo Live keeps the AI Studio audio path and secure ephemeral token boundary',()=>{
 assert.match(bridge,/BidiGenerateContentConstrained/)
 assert.match(bridge,/getUserMedia/)
 assert.match(bridge,/audio\/pcm;rate=16000/)
 assert.match(bridge,/audio\/pcm;rate=24000/)
 assert.match(bridge,/voice_live_token:true/)
 assert.doesNotMatch(bridge,/GEMINI_API_KEY/)
})
