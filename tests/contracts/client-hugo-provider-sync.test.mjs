import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const voice = await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx', import.meta.url), 'utf8')
const catalog = await readFile(new URL('../../src/mvp/voiceCatalog.ts', import.meta.url), 'utf8')
const store = await readFile(new URL('../../src/mvp/client/providerRadarStore.ts', import.meta.url), 'utf8')
const radar = await readFile(new URL('../../src/mvp/ClientQuantumExperience.tsx', import.meta.url), 'utf8')
const bridge = await readFile(new URL('../../src/mvp/client/ClientProviderRadarBridge.tsx', import.meta.url), 'utf8')

test('Hugo and the client radar share one provider availability source of truth', () => {
  assert.match(radar, /from\('proveedores_mapa'\)/)
  assert.match(radar, /setProviderRadarRows\(rows\)/)
  assert.match(store, /from\('proveedores_mapa'\)/)
  assert.match(catalog, /refreshProviderRadar\(sb,true\)/)
  assert.match(catalog, /providerRadarForCategory\(category\.id,\{onlyAvailable:true\}\)/)
  assert.match(store, /provider\.online&&provider\.disponible/)
})

test('canonical Hugo announces only real provider availability and recommendations', () => {
  assert.match(voice, /loadVoiceAvailability/)
  assert.match(voice, /voiceAvailabilityText/)
  assert.match(catalog, /Ahora no veo profesionales de/)
  assert.match(catalog, /Encontré 1 profesional de/)
  assert.match(catalog, /Por los datos reales de UGO/)
  assert.match(catalog, /servicios_completados/)
  assert.match(catalog, /tarifa_base/)
})

test('visual provider cards resolve the same profession aliases Hugo understands', () => {
  assert.match(bridge, /electricista.*electricidad.*eletricista.*eletrica/)
  assert.match(bridge, /plomero.*plomeria.*encanador.*encanamento/)
  assert.match(bridge, /aliasesForCategory/)
  assert.match(bridge, /matchCategory\(categories,flow\.hugoIntent\?\.categoryHint\)/)
  assert.match(bridge, /flow\.navigate\('search'\)/)
})
