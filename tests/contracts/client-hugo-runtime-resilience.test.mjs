import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')

test('production Live token path uses one-use short-lived token without rejected live constraints',()=>{
 assert.match(api,/const request=\{uses:1,expireTime,newSessionExpireTime\}/)
 assert.doesNotMatch(api,/liveConnectConstraints\s*:/)
 assert.match(api,/const model=mode==='transcribe'\?GEMINI_LIVE_TRANSCRIBE_MODEL:GEMINI_LIVE_VOICE_MODEL/)
})

test('Hugo client isolates browser-speech recovery without reviving retired companion paths',()=>{
 assert.doesNotMatch(dock,/ttsCooldownUntil|playDeviceSpeech|SpeechRecognition|webkitSpeechRecognition|companion_mode|askGeminiCompanion/)
 assert.match(dock,/UGOVoiceBridge/)
 assert.match(dock,/sendToolResponse/)
 assert.match(dock,/detail\.engine==='browser-speech'/)
 assert.match(dock,/SpeechSynthesisUtterance/)
 assert.match(dock,/createOrder\(current\)/)
})

test('voice confirmation creates the actual service with exact pickup and payment context',()=>{
 assert.match(dock,/pickupFallback:'none'/)
 assert.match(dock,/payment_method:current\.paymentMethod==='pix'\?'pix':'efectivo'/)
 assert.match(dock,/const serviceId=await createOrder\(current\)/)
 assert.match(dock,/args\.confirmed!==true/)
 assert.match(dock,/onNavigateHome\?\.\(\)/)
})
