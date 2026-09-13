import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const hugo = await readFile(new URL('../../src/mvp/useHugoVoice.ts', import.meta.url), 'utf8')

test('Hugo asks only service, description, address and when before confirmation', () => {
  assert.match(hugo, /type OrderStep='category'\|'description'\|'address'\|'location_consent'\|'when'\|'confirm'/)
  assert.doesNotMatch(hugo, /OrderStep=.*'budget'/)
  assert.match(hugo, /¿Cuándo lo necesitás\? ¿Ahora, hoy o para otro momento\?/) 
})

test('Hugo understands furniture repairs and tomorrow afternoon', () => {
  assert.match(hugo, /mueble\|muebles\|puerta de cocina\|puertas de cocina\|bisagra\|bisagras/)
  assert.match(hugo, /tarde/)
  assert.match(hugo, /whenLabel:`Mañana/)
})

test('Hugo protects the user when an electrical point sparks', () => {
  assert.match(hugo, /chispa\|chispas/)
  assert.match(hugo, /No uses ese enchufe o punto eléctrico hasta que lo revise el profesional/)
})

test('confirmed conversational orders persist schedule metadata and start real dispatch', () => {
  assert.match(hugo, /requested_when:draft\.requestedWhen/)
  assert.match(hugo, /scheduled_at:draft\.requestedWhen==='programar'/)
  assert.match(hugo, /estado:'buscando'/)
  assert.match(hugo, /getDispatchProvider\(\)\.start|await getDispatchProvider\(\)\.start/)
})
