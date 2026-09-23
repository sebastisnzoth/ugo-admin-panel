import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')
const provider=await readFile(new URL('../../src/mvp/provider/ProviderHugoBridge.tsx',import.meta.url),'utf8')

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
 assert.match(bridge,/generationConfig:\{responseModalities:\['AUDIO'\]/)
 assert.match(bridge,/outputAudioTranscription:\{\}/)
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

test('primary Gemini Live session owns streamed audio and tool responses',()=>{
 assert.match(bridge,/playConversationPcm/)
 assert.match(bridge,/content\?\.interrupted/)
 assert.match(bridge,/ugo:native-voice-tool-call/)
 assert.match(bridge,/sendToolResponse/)
 assert.match(bridge,/toolResponse:\{functionResponses/)
})

test('Hugo pauses and resumes the persistent Live session instead of reconnecting every spoken reply',()=>{
 assert.match(dock,/pauseListening/)
 assert.match(dock,/resumeListening/)
 assert.match(dock,/if\(detail\.final===false\)\{setState\('hearing'\);return\}/)
 assert.match(dock,/await nb\.startListening\(\)/)
 assert.match(dock,/Gemini Live no disponible; usando reconocimiento del dispositivo/)
})


test('Client and Provider require the persistent Gemini Live audio speaker and never mask failure with browser speech',()=>{
 assert.match(bridge,/responseModalities:\['AUDIO'\]/)
 assert.match(bridge,/outputAudioTranscription:\{\}/)
 assert.match(bridge,/voice_live_mode:'conversation'/)


\n assert.doesNotMatch(dock,/speechSynthesis\.speak/)\n assert.doesNotMatch(provider,/speechSynthesis\.speak/)\n assert.doesNotMatch(dock,/\/api\/hugo\/chat/)\n assert.doesNotMatch(provider,/\/api\/hugo\/chat/)
 assert.match(api,/GEMINI_LIVE_VOICE_MODEL/)
 assert.match(api,/requestedLiveMode==='speaker'/)
 assert.doesNotMatch(bridge,/speakerSocket/)
 assert.doesNotMatch(bridge,/speakThroughLive/)
})
