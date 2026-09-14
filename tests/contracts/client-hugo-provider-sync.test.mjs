import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const voice = await readFile(new URL('../../src/mvp/useHugoVoice.ts', import.meta.url), 'utf8')
const radar = await readFile(new URL('../../src/mvp/ClientQuantumExperience.tsx', import.meta.url), 'utf8')

test('Hugo and the client radar read provider availability from the same source of truth', () => {
  assert.match(radar, /from\('proveedores_mapa'\)/)
  assert.match(voice, /from\('proveedores_mapa'\)/)
  assert.match(voice, /eq\('online',true\)/)
  assert.match(voice, /eq\('disponible',true\)/)
  assert.match(voice, /eq\('categoria_principal_id',category\.id\)/)
})

test('Hugo announces real provider availability for requests and provider searches', () => {
  assert.match(voice, /resolveAvailableProviders/)
  assert.match(voice, /providerAvailabilityCopy/)
  assert.match(voice, /serviceRequestIntent\(userText\)/)
  assert.match(voice, /searchOnlyIntent\(userText\)/)
  assert.match(voice, /Te los muestro en pantalla/)
})
