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

test('browser voice bridge self-installs without a boot-critical React bootstrap',async()=>{\n const src=await read('src/lib/browserVoiceBridge.ts')\n const app=await read('src/mvp/MvpApp.tsx')\n assert.match(src,/if\(typeof window!==\'undefined\'\)installBrowserBridge\(\)/)\n assert.doesNotMatch(app,/BrowserVoiceBridgeBootstrap/)\n})\n