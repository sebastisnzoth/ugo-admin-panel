import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = await readFile(new URL('../../src/mvp/client/ClientRoot.tsx', import.meta.url), 'utf8')
const bridge = await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx', import.meta.url), 'utf8')
const home = await readFile(new URL('../../src/mvp/client/ClientPremiumHome.tsx', import.meta.url), 'utf8')
const voice = await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const guided = await readFile(new URL('../../src/mvp/client/ClientGuidedRequest.tsx', import.meta.url), 'utf8')
const api = await readFile(new URL('../../api/test.ts', import.meta.url), 'utf8')

test('client mounts one canonical Hugo companion instead of the legacy voice-order modal', () => {
  assert.match(root, /ClientHugoBridge/)
  assert.match(root, /flow\.screen==='request'&&<ClientGuidedRequest/)
  assert.match(root, /flow\.screen!=='request'&&!detailOpen&&<ClientHugoBridge/)
  assert.doesNotMatch(root, /ClientHugoVoiceOrder/)
})

test('guided checkout and canonical Hugo never listen at the same time', () => {
  assert.match(root, /flow\.screen==='request'&&<ClientGuidedRequest/)
  assert.match(root, /flow\.screen!=='request'&&!detailOpen&&<ClientHugoBridge/)
})

test('Hugo companion is wired to the canonical voice dock, real client actions and intents', () => {
  assert.match(bridge, /ClientVoiceHugoDock/)
  assert.match(bridge, /clientActions=\{flow\.actions\}/)
  assert.match(bridge, /onIntent=\{flow\.publishHugoIntent\}/)
  assert.match(bridge, /services=\{services\}/)
})

test('home keeps canonical Hugo available while Activity stays unified', () => {
  assert.match(root, /flow\.screen!=='request'&&!detailOpen&&<ClientHugoBridge/)
  assert.match(bridge, /ClientVoiceHugoDock/)
  assert.match(home, /flow\.publishHugoIntent/)
  assert.match(home, /Abrir Actividad/)
  assert.match(home, /4 rubros principales/)
  assert.doesNotMatch(home, /ClientHugoVoiceOrder/)
})

test('voice and text share the same canonical Hugo state and input handler', () => {
  assert.match(voice, /ugo-hugo-stage-composer/)
  assert.match(voice, /const sendTyped=/)
  assert.match(voice, /void handleText\(value\)/)
  assert.match(voice, /processTextRef\.current=value=>\{void handleText\(value\)\}/)
  assert.match(voice, /inputRef/)
})

test('quantum Hugo stage renders multi-order context and service-scoped cancellation', () => {
  assert.match(voice, /ugo-hugo-stage-card/)
  assert.match(voice, /service\.categoria\?\.nombre/)
  assert.match(voice, /service\?\.proveedor\?\.nombre/)
  assert.match(voice, /services\.length>1/)
  assert.match(voice, /pedidos independientes/)
  assert.match(voice, /Ver Actividad/)
  assert.match(voice, /Cancelar pedido/)
  assert.match(voice, /resolveServiceCandidates/)
  assert.match(voice, /cancelService\(pending\.serviceId\)/)
})

test('guided request uses Gemini as primary understanding with a safe local fallback', () => {
  assert.match(guided, /guided_request:true/)
  assert.match(guided, /interpretWithGemini/)
  assert.match(guided, /Gemini no pudo enriquecer el pedido; usamos la interpretación local/)
  assert.match(guided, /Entendiendo tu pedido con Gemini/)
  assert.match(api, /guidedRequestWithGemini/)
  assert.match(api, /Hacé como máximo una pregunta/)
  assert.match(api, /No preguntes presupuesto/)
  assert.match(api, /responseMimeType:'application\/json'/)
})

test('Firefox and browsers without SpeechRecognition send recorded audio to Gemini', () => {
  assert.match(guided, /MediaRecorder/)
  assert.match(guided, /startGeminiRecording/)
  assert.match(guided, /voice_transcription:true/)
  assert.match(guided, /audio_base64:audio/)
  assert.match(guided, /Gemini está entendiendo tu voz/)
  assert.match(api, /transcribeGeminiAudio/)
  assert.match(api, /inlineData:\{mimeType,data:audioBase64\}/)
  assert.match(api, /AUDIO_MIME_TYPES/)
  assert.match(api, /audioBase64.length>3400000/)
})
