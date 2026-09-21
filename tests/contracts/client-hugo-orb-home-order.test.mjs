import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root=await readFile(new URL('../../src/mvp/client/ClientRoot.tsx',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')

test('Hugo orb is available from Cliente home/request and does not require a secondary screen',()=>{
 assert.match(root,/<ClientHugoBridge\/>/)
 assert.doesNotMatch(root,/!canonical&&!detailOpen&&<ClientHugoBridge\/>/)
})

test('Hugo stays as an orb until the client opens the conversation',()=>{
 assert.match(dock,/\[panelOpen,setPanelOpen\]=useState\(false\)/)
 assert.match(dock,/setPanelOpen\(true\)/)
 assert.match(dock,/setPanelOpen\(false\)/)
 assert.match(dock,/\{panelOpen&&<div className="ugo-hugo-stage-card">/)
})

test('spoken category/problem can begin an order without magic request wording',()=>{
 assert.match(dock,/directCategory=await resolveVoiceCategory\(clean\)/)
 assert.match(dock,/category:suggested/)
 assert.match(dock,/¿Qué hay que hacer\?/)
 assert.match(dock,/syncDraft\(current\)/)
})

test('voice becomes text through the authenticated Gemini Live transcription bridge',()=>{
 assert.match(bridge,/BidiGenerateContentConstrained/)
 assert.match(bridge,/voice_live_token:true/)
 assert.match(bridge,/interimInputTranscription/)
 assert.match(bridge,/inputTranscription/)
 assert.match(bridge,/ugo:native-voice-result/)
 assert.doesNotMatch(bridge,/MediaRecorder/)
 assert.match(dock,/setUserTranscript\(clean\)/)
})

test('confirmed voice order persists one service and starts provider dispatch',()=>{
 assert.match(dock,/from\('servicios'\)\.insert/)
 assert.match(dock,/estado:'buscando'/)
 assert.match(dock,/dispatch\.start\(\{serviceId/)
 assert.match(dock,/isHugoAffirmative/)
})
