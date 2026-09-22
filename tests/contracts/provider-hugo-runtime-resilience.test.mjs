import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const bridge=await readFile(new URL('../../src/mvp/provider/ProviderHugoBridge.tsx',import.meta.url),'utf8')

test('provider Hugo awaits Gemini Live before showing ready and falls back to device recognition',()=>{
 assert.match(bridge,/await bridge\.startListening\(\)/)
 assert.match(bridge,/Gemini Live no disponible; usando reconocimiento del dispositivo/)
 assert.match(bridge,/SpeechRecognition\|\|ugoWindow\(\)\.webkitSpeechRecognition/)
 assert.match(bridge,/getUserMedia/)
})

test('provider Hugo does not wait indefinitely for Gemini TTS',()=>{
 assert.match(bridge,/setTimeout\([^]*1800/)
 assert.match(bridge,/ttsCooldownUntil/)
 assert.match(bridge,/Gemini TTS no disponible; usando voz del dispositivo/)
 assert.match(bridge,/deviceSpeech/)
})

test('provider Hugo resets a failed native session so the orb can retry in one tap',()=>{
 assert.match(bridge,/native\.current=false;setRunning\(false\);busy\.current=false;setState\('error'\)/)
 assert.match(bridge,/resumeListening/)
 assert.match(bridge,/pauseListening/)
})
