import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const hugo = await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const intent = await readFile(new URL('../../src/mvp/client/hugoVoiceIntent.ts', import.meta.url), 'utf8')
const catalog = await readFile(new URL('../../src/mvp/voiceCatalog.ts', import.meta.url), 'utf8')
const types = await readFile(new URL('../../src/mvp/client/clientTypes.ts', import.meta.url), 'utf8')

test('canonical Hugo asks only category, description, address and when before confirmation', () => {
  assert.match(hugo, /function nextMissing\(current:Draft\)/)
  assert.match(hugo, /if\(!current\.category\)return'category'/)
  assert.match(hugo, /if\(!current\.description\)return'description'/)
  assert.match(hugo, /if\(!current\.address\)return'address'/)
  assert.match(hugo, /if\(!current\.when\)return'when'/)
  assert.doesNotMatch(hugo, /return'budget'/)
  assert.match(hugo, /¿Cuándo lo necesitás\? ¿Ahora, hoy o para otro momento\?/) 
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

test('canonical Hugo can create another request while active services exist', () => {
  assert.match(hugo, /services=\[\]/)
  assert.match(hugo, /if\(requestIntent\(clean\)\)/)
  assert.doesNotMatch(hugo, /Ya tenés el pedido/)
  assert.doesNotMatch(hugo, /cancelarlo antes de crear otro/)
})

test('cancellation contract requires one resolved service id', () => {
  assert.match(types, /cancelService: \(serviceId: string\) => Promise<boolean>/)
  assert.match(hugo, /resolveServiceCandidates\(source,services,true\)/)
  assert.match(hugo, /kind:'service',serviceId:candidates\[0\]\.id/)
  assert.match(hugo, /cancelService\(pending\.serviceId\)/)
  assert.match(hugo, /Encontré \$\{candidates\.length\} pedidos que se pueden cancelar/)
})
