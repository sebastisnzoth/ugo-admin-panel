import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const provider=await readFile(new URL('../../src/mvp/provider/ProviderHugoBridge.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')

test('provider Hugo delegates voice resilience to the shared bridge and never hangs forever',()=>{
 assert.match(provider,/await bridge\.startListening\(\)/)
 assert.match(provider,/window\.setTimeout\(\(\)=>/)
 assert.match(provider,/PROVIDER_VOICE_CONNECT_TIMEOUT_MS=16_000/)
 assert.match(provider,/PROVIDER_VOICE_CONNECT_TIMEOUT_MS\);try\{await bridge\.startListening\(\)/)
 assert.match(provider,/Hugo no pudo conectar con el servicio de voz\. Reintentá en unos segundos\./)
 assert.doesNotMatch(provider,/SpeechRecognition|webkitSpeechRecognition|speechSynthesis|deviceSpeech|Gemini TTS/)
 assert.match(bridge,/AbortSignal\.timeout\(5000\)/)
 assert.match(bridge,/Gemini Live setup timeout/)
 assert.match(bridge,/\},6000\)/)
 assert.match(bridge,/gemini-live-start-fallback/)
})

test('provider Hugo returns tool results through the same persistent Live session',()=>{
 assert.match(provider,/ugo:native-voice-tool-call/)
 assert.match(provider,/sendToolResponse/)
 assert.match(bridge,/toolResponse:\{functionResponses/)
 assert.doesNotMatch(bridge,/speakerSocket|speakThroughLive/)
})

test('provider Hugo resets a failed Live session so the orb can retry',()=>{
 assert.match(provider,/setRunning\(false\);setState\('error'\)/)
 assert.match(provider,/bridge\.stopListening\(\)/)
})
