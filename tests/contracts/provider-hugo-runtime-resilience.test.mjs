import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const provider=await readFile(new URL('../../src/mvp/provider/ProviderHugoBridge.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')

test('provider Hugo requires Gemini Live and does not fall back to device recognition',()=>{
 assert.match(provider,/await bridge\.startListening\(\)/)
 assert.match(provider,/Gemini Live no está disponible\. Tocá el orbe para reconectar\./)
 assert.doesNotMatch(provider,/SpeechRecognition|webkitSpeechRecognition|speechSynthesis|deviceSpeech|Gemini TTS/)
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
