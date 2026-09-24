import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
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
 assert.match(dock,/const id=await createOrder\(current\)/)
 assert.match(dock,/onNavigateHome\?\.\(\)/)
})
