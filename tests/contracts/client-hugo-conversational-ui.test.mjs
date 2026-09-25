import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const root=await readFile(new URL('../../src/features/client/ClientRoot.tsx',import.meta.url),'utf8')
const surfaces=await readFile(new URL('../../src/features/client/ui/ClientOperationalSurfaces.tsx',import.meta.url),'utf8')
const globals=await readFile(new URL('../../src/features/client/ui/ClientGlobalSurfaces.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/features/client/hugo/ClientHugoBridge.tsx',import.meta.url),'utf8')
const home=await readFile(new URL('../../src/features/client/home/ClientHomeScreen.tsx',import.meta.url),'utf8')
const voice=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')
const need=await readFile(new URL('../../src/features/client/request/ClientNeedScreen.tsx',import.meta.url),'utf8')
test('client mounts one canonical Hugo companion from home/request instead of the legacy voice-order modal',()=>{assert.match(root,/ClientGlobalSurfaces onOpenNotice=\{openNotice\}/);assert.match(root,/flow\.screen==='request'&&<ClientNeedScreen/);assert.match(globals,/<ClientHugoBridge\/>/);assert.doesNotMatch(globals,/!canonical&&!detailOpen&&<ClientHugoBridge/);assert.doesNotMatch(root,/ClientHugoVoiceOrder/)})
test('home/request keep transactional checkout hidden while the Hugo orb stays available',()=>{assert.match(root,/canonical=flow\\.screen==='home'\\|\\|flow\\.screen==='request'/);assert.match(root,/flow\\.screen==='request'&&<ClientNeedScreen/);assert.match(globals,/<ClientHugoBridge\\/>/);assert.doesNotMatch(surfaces,/ClientPaymentChoice|ClientLiveTracking|ClientCompletionReview|ServiceChat/);assert.match(voice,/ugo-hugo-voice-controller/);assert.doesNotMatch(voice,/ugo-hugo-stage-card/)})
test('Hugo companion is wired to real client actions and stays visible while the request screen advances',()=>{assert.match(bridge,/ClientVoiceHugoDock/);assert.match(bridge,/clientActions=\{flow\.actions\}/);assert.match(bridge,/onIntent=\{flow\.publishHugoIntent\}/);assert.match(bridge,/services=\{services\}/);assert.match(bridge,/requestComposerOpen=\{flow\.screen==='request'\}/);assert.doesNotMatch(voice,/requestComposerWasOpen/);assert.doesNotMatch(voice,/requestComposerOpen[^\n]*setPanelOpen\(false\)/)})
test('home remains unified and does not mount the legacy voice-order modal',()=>{assert.match(bridge,/ClientVoiceHugoDock/);assert.match(home,/flow\.publishHugoIntent/);assert.match(home,/flow\.navigate\(['\"]history['\"]\)/);assert.doesNotMatch(home,/ClientHugoVoiceOrder/)})
test('voice uses one canonical Gemini Live handler without the retired text composer',()=>{assert.match(voice,/ugo:native-voice-tool-call/);assert.match(voice,/sendToolResponse/);assert.match(voice,/ugo-hugo-voice-controller/);assert.doesNotMatch(voice,/processTextRef|handleText\(|ugo-hugo-stage-composer|const sendTyped=|inputRef/)})
test('voice controller keeps multi-order context and service-scoped cancellation logic',()=>{assert.match(voice,/ugo-hugo-voice-controller/);assert.match(voice,/service\.categoria\?\.nombre/);assert.match(voice,/name==='cancel_service'/);assert.match(voice,/String\(args\.service_id\|\|''\)/);assert.match(voice,/args\.confirmed!==true/);assert.match(voice,/cancelService\(serviceId\)/);assert.doesNotMatch(voice,/ugo-hugo-stage-card/)})
test('canonical Hugo keeps one Gemini Live brain and UGO retains action authority',()=>{assert.match(voice,/UGOVoiceBridge/);assert.match(voice,/ugo:native-voice-tool-call/);assert.match(voice,/sendToolResponse/);assert.doesNotMatch(voice,/askGeminiCompanion|companion_mode:true/);assert.match(api,/voice_live_token===true/)})
test('canonical Hugo voice requires Gemini Live and has no parallel browser recognition fallback',()=>{assert.match(voice,/UGOVoiceBridge/);assert.match(voice,/nb\.startListening\(\)/);assert.doesNotMatch(voice,/SpeechRecognition|webkitSpeechRecognition|rec\.onresult|speechSynthesis/);assert.match(api,/voice_live_token===true/)})

test('new Hugo intent replaces stale request form content instead of mixing categories',()=>{assert.match(need,/appliedIntentId=useRef\(0\)/);assert.match(need,/intent\.id!==appliedIntentId\.current/);assert.match(need,/const nextDescription=String\(intent\.description\|\|''\)\.trim\(\)/);assert.match(need,/setDescription\(nextDescription\)/);assert.match(need,/hugoIntentId:intent\.id/);assert.match(need,/categoryName:category\?\.nombre\|\|intent\.categoryHint/)})



test('request description can correct a stale Hugo category before the client continues',()=>{assert.match(need,/resolveVoiceCategoryFromCatalog/);assert.match(need,/descriptionCategory=useMemo/);assert.match(need,/category=descriptionCategory\|\|intentCategory/);assert.match(need,/Hugo ajustó la categoría según lo que escribiste/);assert.match(need,/categoryId:category\.id/)})


test('need step has responsive premium desktop layout and description-gated continuation',()=>{assert.match(need,/canContinue=Boolean\(category&&description\.trim\(\)\.length>=8\)/);assert.match(need,/disabled=\{!canContinue\|\|photoBusy\}/);assert.match(need,/ugo-need-field-label/);assert.match(need,/aria-pressed=\{description\.trim\(\)===option\}/);assert.match(need,/Object\.entries\(QUICK\)\.find\(\(\[name\]\)=>key\.includes\(name\)\)/)})
