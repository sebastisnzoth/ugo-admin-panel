import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const live=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')

test('production Live token path avoids the rejected auth-token field',()=>{
 assert.match(api,/const request=\{uses:1,expireTime,newSessionExpireTime,liveConnectConstraints:/)
 assert.match(api,/model:`models\/\$\{model\}`/)
 assert.match(api,/responseModalities:\[mode==='transcribe'\?'TEXT':'AUDIO'\]/)
})

test('Hugo client has no secondary TTS or browser recognition fallback',()=>{
 assert.doesNotMatch(dock,/ttsCooldownUntil|playDeviceSpeech|SpeechRecognition|webkitSpeechRecognition|speechSynthesis|companion_mode|askGeminiCompanion/)
 assert.match(dock,/UGOVoiceBridge/)
 assert.match(dock,/sendToolResponse/)
})

test('voice confirmation creates the actual service with exact pickup and payment context',()=>{
 assert.match(dock,/pickupFallback:'none'/)
 assert.match(dock,/payment_method:current\.paymentMethod==='pix'\?'pix':'efectivo'/)
 assert.match(dock,/const serviceId=await createOrder\(current\)/)
 assert.match(dock,/args\.confirmed!==true/)
 assert.match(dock,/onNavigateHome\?\.\(\)/)
})

test('voice service reads resolve owned context before using a service id',()=>{
 assert.match(live,/get_current_service/)
 assert.match(live,/get_provider_tracking/)
 assert.match(dock,/AMBIGUOUS_SERVICE/)
 assert.match(dock,/resolveActiveService/)
 assert.match(dock,/obtener_tracking_servicio_cliente/)
 assert.match(dock,/eq\('cliente_id',user\.id\)/)
})

test('Gemini Live tools cannot leave Hugo waiting forever and output is reflected in the orb',()=>{
 assert.match(live,/TOOL_RESPONSE_TIMEOUT_MS=30_000/)
 assert.match(live,/code:'TOOL_TIMEOUT'/)
 assert.match(live,/pendingToolTimers/)
 assert.match(live,/roleInstruction\(role\)/)
 assert.match(dock,/setAssistantTranscript/)
 assert.match(dock,/ugo:native-voice-output/)
})
