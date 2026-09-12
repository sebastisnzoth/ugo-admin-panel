import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('provider demand preserves backend geography without schematic positions', () => {
  const data = read('src/mvp/provider/providerData.tsx')
  const demand = read('src/mvp/provider/ProviderDemand.tsx')
  const map = read('src/mvp/provider/ProviderDemandMap.tsx')

  assert.match(data, /obtener_demanda_proveedor/)
  assert.match(data, /latitude=coordinate\(row\.zona_lat\)/)
  assert.match(data, /longitude=coordinate\(row\.zona_lng\)/)
  assert.match(map, /new maplibregl\.Marker/)
  assert.match(map, /signal\.latitude!=null&&signal\.longitude!=null/)
  assert.doesNotMatch(demand, /demand-pulse/)
  assert.match(demand, /Zona sin coordenadas publicadas/)
})

test('provider opportunities refresh in realtime and acceptance stays server-authoritative', () => {
  const realtime = read('src/mvp/provider/useProviderRealtime.ts')
  const service = read('src/mvp/provider/providerService.ts')

  assert.match(realtime, /table:'ofertas_servicio'/)
  assert.match(realtime, /table:'servicios'/)
  assert.match(realtime, /table:'pagos'/)
  assert.doesNotMatch(realtime, /table:'perfiles_proveedor'/)
  assert.match(service, /rpc\('aceptar_oferta'/)
  assert.match(service, /if\(!data\)throw new Error/)
})

test('provider demand has an automatic refresh fallback while online', () => {
  const data = read('src/mvp/provider/providerData.tsx')

  assert.match(data, /marketAutoRefresh/)
  assert.match(data, /setInterval\(refresh,45_000\)/)
  assert.match(data, /visibilitychange/)
  assert.match(data, /window\.addEventListener\('focus'/)
})
