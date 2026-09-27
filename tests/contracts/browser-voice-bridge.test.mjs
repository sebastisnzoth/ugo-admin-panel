import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('browser voice bridge reuses the native voice event contract',async()=>{
 const src=await read('src/shared/voice/BrowserVoiceBridgeBootstrap.tsx')
 assert.match(src,/SpeechRecognition\|\|target\.webkitSpeechRecognition/)
 assert.match(src,/continuous=true/)
 assert.match(src,/interimResults=true/)
 assert.match(src,/ugo:native-voice-result/)
 assert.match(src,/ugo:native-voice-state/)
 assert.match(src,/ugo:native-voice-error/)
 assert.match(src,/navigator\.language/)
})

test('browser voice bridge restarts listening across phrases and supports explicit stop',async()=>{
 const src=await read('src/shared/voice/BrowserVoiceBridgeBootstrap.tsx')
 assert.match(src,/instance\.onend=.*restart/)
 assert.match(src,/startListening/)
 assert.match(src,/pauseListening/)
 assert.match(src,/resumeListening/)
 assert.match(src,/stopListening/)
 assert.match(src,/active=false/)
})

test('client and provider apps mount the browser voice bridge before role surfaces',async()=>{
 const src=await read('src/mvp/MvpApp.tsx')
 assert.match(src,/BrowserVoiceBridgeBootstrap/)
 assert.match(src,/const app=<><BrowserVoiceBridgeBootstrap\/><RecoveryGate role="client"/)
 assert.match(src,/const app=<><BrowserVoiceBridgeBootstrap\/><RecoveryGate role="provider"/)
})
