import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root=await readFile(new URL('../../src/mvp/client/ClientRoot.tsx',import.meta.url),'utf8')
const globals=await readFile(new URL('../../src/features/client/ui/ClientGlobalSurfaces.tsx',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')

test('Hugo orb is available from Cliente home/request and does not require a secondary screen',()=>{
 assert.match(root,/ClientGlobalSurfaces onOpenNotice=\{openNotice\}/)
 assert.match(globals,/<ClientHugoBridge\/>/)
 assert.doesNotMatch(globals,/!canonical&&!detailOpen&&<ClientHugoBridge\/>/)
})

test('Hugo stays voice-only: the orb opens the controller without restoring a text conversation',()=>{
 assert.match(dock,/\[panelOpen,setPanelOpen\]=useState\(false\)/)
 assert.match(dock,/setPanelOpen\(true\)/)
 assert.match(dock,/setPanelOpen\(false\)/)
 assert.match(dock,/ugo-hugo-voice-controller/)
 assert.doesNotMatch(dock,/ugo-hugo-stage-card/)
 assert.doesNotMatch(dock,/sendTyped|inputRef|\[typed,setTyped\]/)
})

test('spoken category/problem begins an order through the Live category and description tools',()=>{assert.match(voice,/name==='set_request_category'/);assert.match(voice,/resolveVoiceCategory\(String\(args\.category\|\|''\)\)/);assert.match(voice,/name==='set_request_description'/);assert.match(voice,/emptyVoiceDraft\(null\)/)})

test('voice becomes text through authenticated Gemini Live input transcription',()=>{assert.match(voice,/ugo:native-voice-transcript/);assert.match(voice,/setUserTranscript\(value\)/);assert.match(browserVoice,/inputAudioTranscription:\{\}/);assert.match(browserVoice,/voice_live_token:true/)})

test('confirmed voice order persists one service and starts provider dispatch',()=>{
 assert.match(dock,/from\('servicios'\)\.insert/)
 assert.match(dock,/estado:'buscando'/)
 assert.match(dock,/dispatch\.start\(\{serviceId/)
 assert.match(dock,/isHugoAffirmative/)
})
