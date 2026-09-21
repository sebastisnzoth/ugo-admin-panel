import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')
const tts=await readFile(new URL('../../api/hugo/chat.ts',import.meta.url),'utf8')

test('production Live token path avoids the rejected auth-token field',()=>{
 assert.match(api,/const request=\{uses:1,expireTime,newSessionExpireTime\}/)
 assert.doesNotMatch(api,/liveConnectConstraints:\{model/)
})

test('Hugo falls back quickly when Gemini TTS quota is exhausted',()=>{
 assert.match(dock,/ttsCooldownUntil/)
 assert.match(dock,/Date\.now\(\)<ttsCooldownUntil\.current/)
 assert.match(dock,/1800/)
 assert.match(dock,/playDeviceSpeech/)
 assert.match(tts,/if\(response\.status===429\)break/)
})

test('voice confirmation creates the actual service with exact pickup and payment context',()=>{
 assert.match(dock,/pickupFallback:'none'/)
 assert.match(dock,/payment_method:current\.paymentMethod==='pix'\?'pix':'efectivo'/)
 assert.match(dock,/const id=await createOrder\(current\)/)
 assert.match(dock,/onNavigateHome\?\.\(\)/)
})
