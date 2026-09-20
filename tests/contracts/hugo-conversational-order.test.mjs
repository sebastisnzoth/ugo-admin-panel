import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const hugo = await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const intent = await readFile(new URL('../../src/mvp/client/hugoVoiceIntent.ts', import.meta.url), 'utf8')
const catalog = await readFile(new URL('../../src/mvp/voiceCatalog.ts', import.meta.url), 'utf8')
const types = await readFile(new URL('../../src/mvp/client/clientTypes.ts', import.meta.url), 'utf8')
const api = await readFile(new URL('../../api/test.ts', import.meta.url), 'utf8')

test('canonical Hugo asks only category, description, address and when before confirmation', () => {
  assert.match(hugo, /function nextMissing\(current:Draft\)/)
  assert.match(hugo, /if\(!current\.category\)return'category'/)
  assert.match(hugo, /if\(!current\.description\)return'description'/)
  assert.match(hugo, /if\(!current\.address\)return'address'/)
  assert.match(hugo, /if\(!current\.when\)return'when'/)
  assert.doesNotMatch(hugo, /return'budget'/)
  assert.match(hugo, /¿Y para cuándo lo necesitás\? ¿Ahora, hoy o para otro momento\?/) 
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

test('Hugo orb uses authenticated Gemini as its conversational companion while UGO keeps action authority', () => {
  assert.match(hugo, /companion_mode:true/)
  assert.match(hugo, /Authorization:\`Bearer \${accessToken}\`/)
  assert.match(hugo, /history:conversation\.current\.slice\(0,-1\)/)
  assert.match(hugo, /const companion=await askGeminiCompanion\(clean\)/)
  assert.match(hugo, /companion\.category_hint/)
  assert.match(api, /el compañero de confianza del cliente dentro de U\.G\.O\./)
  assert.match(api, /CATEGORIAS UGO REALES/)
  assert.match(api, /action=prepare_request/)
  assert.match(api, /Nunca digas que un pedido fue creado o una oferta enviada/)
})

test('active assigned service does not hijack a new Hugo request', () => {
  assert.match(hugo, /function newRequestIntent\(text:string\)/)
  assert.match(hugo, /const directCategory=await resolveVoiceCategory\(clean\)/)
  assert.match(hugo, /if\(directCategory\|\|newRequestIntent\(clean\)\)/)
  assert.doesNotMatch(hugo, /statusIntent\(clean\)\|\|services\.length/)
  assert.match(api, /REGLA MULTIPEDIDO/)
  assert.match(api, /necesito un pintor/)
  assert.match(api, /NO respondas con el estado del servicio activo/)
})

