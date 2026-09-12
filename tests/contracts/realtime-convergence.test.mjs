import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const clientUrl = new URL('../../src/mvp/ClientLiveTracking.tsx', import.meta.url)
const providerUrl = new URL('../../src/mvp/provider/useProviderRealtime.ts', import.meta.url)

test('client realtime scopes payment events and resyncs after reconnect', async () => {
  const source = await readFile(clientUrl, 'utf8')

  assert.match(source, /table:'servicios',filter:`cliente_id=eq\.\$\{data\.user\.id\}`/)
  assert.match(source, /table:'pagos',filter:`cliente_id=eq\.\$\{data\.user\.id\}`/)
  assert.match(source, /status==='SUBSCRIBED'/)
  assert.match(source, /window\.addEventListener\('online',resync\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange',onVisibility\)/)
})

test('provider realtime resyncs authoritative state after reconnect', async () => {
  const source = await readFile(providerUrl, 'utf8')

  assert.match(source, /table:'ofertas_servicio',filter:`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(source, /table:'servicios',filter:`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(source, /table:'pagos',filter:`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(source, /status==='SUBSCRIBED'/)
  assert.match(source, /window\.addEventListener\('online',resync\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange',onVisibility\)/)
})
