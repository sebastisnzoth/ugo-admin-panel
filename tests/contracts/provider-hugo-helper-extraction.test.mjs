import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider Hugo delegates interpretation to Gemini Live and executes only declared UGO tools',async()=>{
 const[bridge,live]=await Promise.all([read('src/mvp/provider/ProviderHugoBridge.tsx'),read('src/lib/browserVoiceBridge.ts')])
 assert.match(bridge,/UGOVoiceBridge/)
 assert.match(bridge,/ugo:native-voice-tool-call/)
 assert.match(bridge,/sendToolResponse/)
 assert.match(bridge,/provider_list_opportunities/)
 assert.match(bridge,/provider_update_service_status/)
 assert.match(live,/PROVIDER_TOOLS/)
 assert.doesNotMatch(bridge,/SpeechRecognition|webkitSpeechRecognition|speechSynthesis|companion_mode|\/api\/hugo\/chat/)
})
