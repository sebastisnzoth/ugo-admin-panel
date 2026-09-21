import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')

test('Hugo browser voice streams PCM to Gemini Live with an ephemeral token',()=>{
 assert.match(bridge,/BidiGenerateContentConstrained/)
 assert.match(bridge,/access_token=/)
 assert.match(bridge,/voice_live_token:true/)
 assert.match(bridge,/audio\/pcm;rate=16000/)
 assert.match(bridge,/CHUNK_SAMPLES=1600/)
 assert.doesNotMatch(bridge,/MediaRecorder/)
 assert.doesNotMatch(bridge,/audio_base64/)
})

test('Gemini Live websocket setup uses transcription, VAD and incremental results',()=>{
 assert.match(bridge,/generationConfig:\{responseModalities:\['TEXT'\]\}/)
 assert.match(bridge,/inputAudioTranscription:\{\}/)
 assert.match(bridge,/silenceDurationMs:500/)
 assert.match(bridge,/END_SENSITIVITY_HIGH/)
 assert.match(bridge,/interimInputTranscription/)
 assert.match(bridge,/inputTranscription/)
 assert.match(bridge,/final:false/)
 assert.match(bridge,/final:true/)
})

test('ephemeral token request uses a short one-use token without the production-rejected constraint field',()=>{
 assert.match(api,/voice_live_token===true/)
 assert.match(api,/generativelanguage\.googleapis\.com\/v1beta\/auth_tokens/)
 assert.match(api,/const request=\{uses:1,expireTime,newSessionExpireTime\}/)
 assert.doesNotMatch(api,/liveConnectConstraints:\{model/)
 assert.doesNotMatch(api,/auth_token\s*:/)
})

test('Hugo pauses and resumes the persistent Live session instead of reconnecting every spoken reply',()=>{
 assert.match(dock,/pauseListening/)
 assert.match(dock,/resumeListening/)
 assert.match(dock,/if\(detail\.final===false\)\{setState\('hearing'\);return\}/)
 assert.match(dock,/await nb\.startListening\(\)/)
 assert.match(dock,/Gemini Live no disponible; usando reconocimiento del dispositivo/)
})
