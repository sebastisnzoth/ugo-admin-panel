import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const root=await readFile(new URL('../../src/mvp/client/ClientRoot.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')
const home=await readFile(new URL('../../src/mvp/client/ClientPremiumHome.tsx',import.meta.url),'utf8')
const voice=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const guided=await readFile(new URL('../../src/mvp/client/ClientGuidedRequest.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')
const need=await readFile(new URL('../../src/mvp/client/ClientNeedScreen.tsx',import.meta.url),'utf8')
test('client mounts one canonical Hugo companion from home/request instead of the legacy voice-order modal',()=>{assert.match(root,/ClientHugoBridge/);assert.match(root,/flow\.screen==='request'&&<ClientNeedScreen/);assert.match(root,/!detailOpen&&<ClientHugoBridge/);assert.doesNotMatch(root,/!canonical&&!detailOpen&&<ClientHugoBridge/);assert.doesNotMatch(root,/ClientHugoVoiceOrder/)})
test('home/request keep transactional checkout hidden while the Hugo orb stays available',()=>{assert.match(root,/canonical=flow\.screen==='home'\|\|flow\.screen==='request'/);assert.match(root,/flow\.screen==='request'&&<ClientNeedScreen/);assert.match(root,/!detailOpen&&<ClientHugoBridge/);assert.match(root,/!canonical&&!detailOpen&&<ClientPaymentChoice/);assert.match(voice,/\{panelOpen&&<div className="ugo-hugo-stage-card">/)})
test('Hugo companion is wired to the canonical voice dock, real client actions and intents',()=>{assert.match(bridge,/ClientVoiceHugoDock/);assert.match(bridge,/clientActions=\{flow\.actions\}/);assert.match(bridge,/onIntent=\{flow\.publishHugoIntent\}/);assert.match(bridge,/services=\{services\}/);assert.match(bridge,/requestComposerOpen=\{flow\.screen==='request'\}/);assert.match(voice,/if\(requestComposerOpen&&!requestComposerWasOpen\.current\)stop\(\)/)})
test('home remains unified and does not mount the legacy voice-order modal',()=>{assert.match(bridge,/ClientVoiceHugoDock/);assert.match(home,/flow\.publishHugoIntent/);assert.match(home,/Abrir Actividad/);assert.match(home,/4 rubros principales/);assert.doesNotMatch(home,/ClientHugoVoiceOrder/)})
test('voice and text share the same canonical Hugo state and input handler',()=>{assert.match(voice,/ugo-hugo-stage-composer/);assert.match(voice,/const sendTyped=/);assert.match(voice,/void handleText\(value\)/);assert.match(voice,/processTextRef\.current=value=>\{void handleText\(value\)\}/);assert.match(voice,/inputRef/)})
test('quantum Hugo stage renders multi-order context and service-scoped cancellation',()=>{assert.match(voice,/ugo-hugo-stage-card/);assert.match(voice,/service\.categoria\?\.nombre/);assert.match(voice,/service\?\.proveedor\?\.nombre/);assert.match(voice,/services\.length>1/);assert.match(voice,/pedidos independientes/);assert.match(voice,/Ver Actividad/);assert.match(voice,/Cancelar pedido/);assert.match(voice,/resolveServiceCandidates/);assert.match(voice,/cancelService\(pending\.serviceId\)/)})
test('legacy guided request keeps Gemini fallback while it remains a non-mounted compatibility module',()=>{assert.match(guided,/guided_request:true/);assert.match(guided,/interpretWithGemini/);assert.match(api,/guidedRequestWithGemini/);assert.match(api,/responseMimeType:'application\/json'/)})
test('legacy compatibility voice transcription remains supported',()=>{assert.match(guided,/MediaRecorder/);assert.match(guided,/startGeminiRecording/);assert.match(api,/transcribeGeminiAudio/);assert.match(api,/AUDIO_MIME_TYPES/)})

test('new Hugo intent replaces stale request form content instead of mixing categories',()=>{assert.match(need,/appliedIntentId=useRef\(0\)/);assert.match(need,/intent\.id!==appliedIntentId\.current/);assert.match(need,/const nextDescription=String\(intent\.description\|\|''\)\.trim\(\)/);assert.match(need,/setDescription\(nextDescription\)/);assert.match(need,/hugoIntentId:intent\.id/);assert.match(need,/categoryName:category\?\.nombre\|\|intent\.categoryHint/)})



test('request description can correct a stale Hugo category before the client continues',()=>{assert.match(need,/resolveVoiceCategoryFromCatalog/);assert.match(need,/descriptionCategory=useMemo/);assert.match(need,/category=descriptionCategory\|\|intentCategory/);assert.match(need,/Hugo ajustó la categoría según lo que escribiste/);assert.match(need,/categoryId:category\.id/)})


test('need step has responsive premium desktop layout and description-gated continuation',()=>{assert.match(need,/canContinue=Boolean\(category&&description\.trim\(\)\.length>=8\)/);assert.match(need,/disabled=\{!canContinue\}/);assert.match(need,/ugo-need-field-label/);assert.match(need,/aria-pressed=\{description\.trim\(\)===option\}/);assert.match(need,/Object\.entries\(QUICK\)\.find\(\(\[name\]\)=>key\.includes\(name\)\)/)})
