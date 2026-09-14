import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = await readFile(new URL('../../src/mvp/client/ClientRoot.tsx', import.meta.url), 'utf8')
const bridge = await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx', import.meta.url), 'utf8')
const home = await readFile(new URL('../../src/mvp/client/ClientPremiumHome.tsx', import.meta.url), 'utf8')
const voice = await readFile(new URL('../../src/mvp/VoiceHugoDock.tsx', import.meta.url), 'utf8')
const events = await readFile(new URL('../../src/mvp/uiEvents.ts', import.meta.url), 'utf8')
const guided = await readFile(new URL('../../src/mvp/client/ClientGuidedRequest.tsx', import.meta.url), 'utf8')
const api = await readFile(new URL('../../api/test.ts', import.meta.url), 'utf8')

test('client mounts one canonical Hugo companion instead of the legacy voice-order modal', () => {
  assert.match(root, /ClientHugoBridge/)
  assert.doesNotMatch(root, /ClientHugoVoiceOrder/)
})

test('Hugo companion is wired to the canonical voice dock, real client actions and intents', () => {
  assert.match(bridge, /ClientVoiceHugoDock/)
  assert.match(bridge, /clientActions=\{flow\.actions\}/)
  assert.match(bridge, /onIntent=\{flow\.publishHugoIntent\}/)
})

test('home makes Hugo the primary conversational entrypoint while Activity stays unified', () => {
  assert.match(home, /Contame qué necesitás\. Yo te ayudo a resolverlo\./)
  assert.match(home, /Hablar con Hugo/)
  assert.match(home, /Escribirle a Hugo/)
  assert.match(home, /UGO_UI_EVENTS\.clientHugo/)
  assert.match(home, /UGO_UI_EVENTS\.clientHugoText/)
  assert.match(home, />Actividad</)
  assert.doesNotMatch(home, />Servicios</)
  assert.doesNotMatch(home, /UGO_CLIENT_GUIDED_REQUEST_OPEN/)
})

test('voice and text share the same canonical Hugo state', () => {
  assert.match(events, /clientHugoText/)
  assert.match(voice, /ugo-hugo-stage-composer/)
  assert.match(voice, /voice\.sendText/)
  assert.match(voice, /UGO_UI_EVENTS\.clientHugoText/)
  assert.match(voice, /textInputRef/)
})

test('quantum Hugo stage renders real service context and contextual actions', () => {
  assert.match(voice, /ugo-hugo-stage-card/)
  assert.match(voice, /service\.categoria\?\.nombre/)
  assert.match(voice, /service\?\.proveedor\?\.nombre/)
  assert.match(voice, /Ver Actividad/)
  assert.match(voice, /Cancelar pedido/)
  assert.match(voice, /Revisar trabajo/)
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
