import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const hugo = await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const intent = await readFile(new URL('../../src/features/client/hugo/hugoVoiceIntent.ts', import.meta.url), 'utf8')
const catalog = await readFile(new URL('../../src/mvp/voiceCatalog.ts', import.meta.url), 'utf8')
const types = await readFile(new URL('../../src/features/client/types/clientTypes.ts', import.meta.url), 'utf8')
const api = await readFile(new URL('../../api/test.ts', import.meta.url), 'utf8')

test('canonical Hugo mirrors written request fields before confirmation', () => {
  assert.match(hugo, /function nextMissing\(current:Draft\)/)
  assert.match(hugo, /if\(!current\.category\)return'category'/)
  assert.match(hugo, /if\(!current\.description\)return'description'/)
  assert.match(hugo, /if\(!current\.address\)return'address'/)
  assert.match(hugo, /if\(!current\.when\)return'when'/)
  assert.match(hugo, /if\(!current\.paymentMethod\)return'payment'/)
  assert.doesNotMatch(hugo, /return'budget'/)
  assert.match(hugo, /¿Cuándo lo necesitás\? ¿Ahora, hoy o para otro momento\?/)
  assert.match(hugo, /¿Cómo vas a pagar: efectivo o PIX\?/) 
})

test('canonical Hugo understands furniture repairs and tomorrow afternoon', () => {
  assert.match(catalog, /mueble\|muebles\|puerta de cocina\|puertas de cocina\|bisagra\|bisagras/)
  assert.match(intent, /\btarde\b/)
  assert.match(intent, /whenLabel:`Mañana/)
})

test('confirmed conversational orders are idempotent and start real dispatch', () => {
  assert.match(hugo, /request_draft_id:current\.requestDraftId/)
  assert.match(hugo, /requested_when:current\.when/)
  assert.match(hugo, /scheduled_at:current\.when==='programar'/)
  assert.match(hugo, /estado:'buscando'/)
  assert.match(hugo, /metadata->>request_draft_id/)
  assert.match(hugo, /dispatch\.start\(\{serviceId/)
})

test('canonical Hugo can create another request while active services exist',()=>{assert.match(hugo,/name==='set_request_category'/);assert.match(hugo,/emptyVoiceDraft\(null\)/);assert.match(hugo,/name==='create_service_request'/);assert.doesNotMatch(hugo,/cancelarlo antes de crear otro/)})

test('cancellation contract requires one resolved service id', () => {
  assert.match(types, /cancelService: \(serviceId: string\) => Promise<boolean>/)
  assert.match(hugo, /resolveServiceCandidates\(source,services,true\)/)
  assert.match(hugo, /kind:'service',serviceId:candidates\[0\]\.id/)
  assert.match(hugo, /cancelService\(pending\.serviceId\)/)
  assert.match(hugo, /Encontré \$\{candidates\.length\} pedidos que se pueden cancelar/)
})

test('Hugo orb uses authenticated Gemini Live while UGO keeps action authority',()=>{assert.match(hugo,/UGOVoiceBridge/);assert.match(hugo,/ugo:native-voice-tool-call/);assert.match(hugo,/sendToolResponse/);assert.doesNotMatch(hugo,/companion_mode:true|askGeminiCompanion/)})

test('active assigned service does not hijack a new Hugo request',()=>{assert.match(hugo,/name==='set_request_category'/);assert.match(hugo,/emptyVoiceDraft\(null\)/);assert.match(hugo,/name==='create_service_request'/);assert.doesNotMatch(hugo,/statusIntent\(clean\)\|\|services\.length/)})

