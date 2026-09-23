import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const root=await readFile(new URL('../../src/mvp/client/ClientRoot.tsx',import.meta.url),'utf8')
const surfaces=await readFile(new URL('../../src/features/client/ui/ClientOperationalSurfaces.tsx',import.meta.url),'utf8')
const globals=await readFile(new URL('../../src/features/client/ui/ClientGlobalSurfaces.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/features/client/hugo/ClientHugoBridge.tsx',import.meta.url),'utf8')
const home=await readFile(new URL('../../src/mvp/client/ClientPremiumHome.tsx',import.meta.url),'utf8')
const voice=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const api=await readFile(new URL('../../api/test.ts',import.meta.url),'utf8')
const need=await readFile(new URL('../../src/features/client/request/ClientNeedScreen.tsx',import.meta.url),'utf8')
test('client mounts one canonical Hugo companion from home/request instead of the legacy voice-order modal',()=>{assert.match(root,/ClientGlobalSurfaces onOpenNotice=\{openNotice\}/);assert.match(root,/flow\.screen==='request'&&<ClientNeedScreen/);assert.match(globals,/<ClientHugoBridge\/>/);assert.doesNotMatch(globals,/!canonical&&!detailOpen&&<ClientHugoBridge/);assert.doesNotMatch(root,/ClientHugoVoiceOrder/)})
test('home/request keep transactional checkout hidden while the Hugo orb stays available',()=>{assert.match(root,/canonical=flow\.screen==='home'\|\|flow\.screen==='request'/);assert.match(root,/flow\.screen==='request'&&<ClientNeedScreen/);assert.match(globals,/<ClientHugoBridge\/>/);assert.match(surfaces,/!canonical&&!detailOpen&&<ClientPaymentChoice/);assert.match(voice,/ugo-hugo-voice-controller/);assert.doesNotMatch(voice,/ugo-hugo-stage-card/)})
test('Hugo companion is wired to real client actions and stays visible while the request screen advances',()=>{assert.match(bridge,/ClientVoiceHugoDock/);assert.match(bridge,/clientActions=\{flow\.actions\}/);assert.match(bridge,/onIntent=\{flow\.publishHugoIntent\}/);assert.match(bridge,/services=\{services\}/);assert.match(bridge,/requestComposerOpen=\{flow\.screen==='request'\}/);assert.doesNotMatch(voice,/requestComposerWasOpen/);assert.doesNotMatch(voice,/requestComposerOpen[^\n]*setPanelOpen\(false\)/)})
test('home remains unified and does not mount the legacy voice-order modal',()=>{assert.match(bridge,/ClientVoiceHugoDock/);assert.match(home,/flow\.publishHugoIntent/);assert.match(home,/Abrir Actividad/);assert.match(home,/4 rubros principales/);assert.doesNotMatch(home,/ClientHugoVoiceOrder/)})
test('voice uses one canonical Hugo handler without the retired text composer',()=>{assert.match(voice,/processTextRef\.current=value=>\{void handleText\(value\)\}/);assert.match(voice,/ugo-hugo-voice-controller/);assert.doesNotMatch(voice,/ugo-hugo-stage-composer|const sendTyped=|inputRef/)})
test('voice controller keeps multi-order context and service-scoped cancellation logic',()=>{assert.match(voice,/ugo-hugo-voice-controller/);assert.match(voice,/service\.categoria\?\.nombre/);assert.match(voice,/resolveServiceCandidates/);assert.match(voice,/cancelService\(pending\.serviceId\)/);assert.doesNotMatch(voice,/ugo-hugo-stage-card/)})
test('canonical Hugo companion keeps Gemini fallback behind the live voice boundary',()=>{assert.match(voice,/const askGeminiCompanion=useCallback/);assert.match(voice,/fetch\('\/api\/test'/);assert.match(voice,/companion_mode:true/);assert.match(api,/responseMimeType:'application\/json'/)})
test('canonical Hugo voice keeps native and browser speech recognition fallbacks',()=>{assert.match(voice,/UGOVoiceBridge/);assert.match(voice,/SpeechRecognition\|\|ugoWindow\(\)\.webkitSpeechRecognition/);assert.match(voice,/navigator\.mediaDevices\?\.getUserMedia/);assert.match(voice,/rec\.onresult=/);assert.match(api,/voice_live_token===true/)})

test('new Hugo intent replaces stale request form content instead of mixing categories',()=>{assert.match(need,/appliedIntentId=useRef\(0\)/);assert.match(need,/intent\.id!==appliedIntentId\.current/);assert.match(need,/const nextDescription=String\(intent\.description\|\|''\)\.trim\(\)/);assert.match(need,/setDescription\(nextDescription\)/);assert.match(need,/hugoIntentId:intent\.id/);assert.match(need,/categoryName:category\?\.nombre\|\|intent\.categoryHint/)})



test('request description can correct a stale Hugo category before the client continues',()=>{assert.match(need,/resolveVoiceCategoryFromCatalog/);assert.match(need,/descriptionCategory=useMemo/);assert.match(need,/category=descriptionCategory\|\|intentCategory/);assert.match(need,/Hugo ajustó la categoría según lo que escribiste/);assert.match(need,/categoryId:category\.id/)})


test('need step has responsive premium desktop layout and description-gated continuation',()=>{assert.match(need,/canContinue=Boolean\(category&&description\.trim\(\)\.length>=8\)/);assert.match(need,/disabled=\{!canContinue\|\|photoBusy\}/);assert.match(need,/ugo-need-field-label/);assert.match(need,/aria-pressed=\{description\.trim\(\)===option\}/);assert.match(need,/Object\.entries\(QUICK\)\.find\(\(\[name\]\)=>key\.includes\(name\)\)/)})
