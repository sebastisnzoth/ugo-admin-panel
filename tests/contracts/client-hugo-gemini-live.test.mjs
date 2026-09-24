import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')
const provider=await readFile(new URL('../../src/mvp/provider/ProviderHugoBridge.tsx',import.meta.url),'utf8')
const adminOrb=await readFile(new URL('../../src/components/ConversationalOrb.tsx',import.meta.url),'utf8')

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

test('ephemeral token request is one-use and constrained to the selected Live model and modality',()=>{
 assert.match(api,/voice_live_token===true/)
 assert.match(api,/generativelanguage\.googleapis\.com\/v1beta\/auth_tokens/)
 assert.match(api,/const request=\{uses:1,expireTime,newSessionExpireTime,liveConnectConstraints:/)
 assert.match(api,/model:`models\/\$\{model\}`/)
 assert.match(api,/responseModalities:\[mode==='transcribe'\?'TEXT':'AUDIO'\]/)
 assert.doesNotMatch(api,/auth_token\s*:/)
})

test('primary Gemini Live session owns streamed audio and tool responses',()=>{
 assert.match(bridge,/playConversationPcm/)
 assert.match(bridge,/content\?\.interrupted/)
 assert.match(bridge,/ugo:native-voice-tool-call/)
 assert.match(bridge,/sendToolResponse/)
 assert.match(bridge,/toolResponse:\{functionResponses/)
})

test('Hugo keeps Gemini Live as the only voice path instead of falling back to browser recognition',()=>{
 assert.match(dock,/await nb\.startListening\(\)/)
 assert.match(dock,/Gemini Live no está disponible\. Tocá el orbe para reconectar\./)
 assert.doesNotMatch(dock,/usando reconocimiento del dispositivo/)
 assert.doesNotMatch(provider,/usando reconocimiento del dispositivo/)
 assert.doesNotMatch(dock,/void handleText\(value\)/)
})


test('Client and Provider require the persistent Gemini Live audio speaker and never mask failure with browser speech',()=>{
 assert.match(bridge,/responseModalities:\['AUDIO'\]/)
 assert.match(bridge,/outputAudioTranscription:\{\}/)
 assert.match(bridge,/voice_live_mode:'conversation'/)



 assert.doesNotMatch(dock,/speechSynthesis\.speak/)
 assert.doesNotMatch(provider,/speechSynthesis\.speak/)
 assert.doesNotMatch(dock,/\/api\/hugo\/chat/)
 assert.doesNotMatch(provider,/\/api\/hugo\/chat/)
 assert.match(api,/GEMINI_LIVE_VOICE_MODEL/)
 assert.match(api,/requestedLiveMode==='conversation'/)
 assert.doesNotMatch(bridge,/speakerSocket/)
 assert.doesNotMatch(bridge,/speakThroughLive/)
})


test('Gemini Live declares bounded role tools in the same persistent session',()=>{
 assert.match(bridge,/functionDeclarations:roleTools\(\)/)
 assert.match(bridge,/get_current_location/)
 assert.match(bridge,/create_service_request/)
 assert.match(bridge,/provider_set_online/)
 assert.match(bridge,/provider_accept_job/)
 assert.match(provider,/ugo:native-voice-tool-call/)
 assert.match(provider,/sendToolResponse/)
 assert.match(bridge,/admin_get_operational_summary/)
 assert.match(bridge,/admin_find_service/)
 assert.match(bridge,/admin_find_user/)
})

test('Admin voice executes bounded reads through the same Gemini Live tool channel',()=>{
 assert.match(adminOrb,/ugo:native-voice-tool-call/)
 assert.match(adminOrb,/sendToolResponse/)
 assert.match(adminOrb,/admin_get_operational_summary/)
 assert.match(adminOrb,/admin_find_service/)
 assert.match(adminOrb,/admin_find_user/)
 assert.doesNotMatch(adminOrb,/speechSynthesis/)
})
