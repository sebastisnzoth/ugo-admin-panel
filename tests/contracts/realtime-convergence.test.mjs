import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const clientUrl = new URL('../../src/features/client/order/ClientLiveTracking.tsx', import.meta.url)
const providerUrl = new URL('../../src/mvp/provider/useProviderRealtime.ts', import.meta.url)

test('client realtime scopes selected service and resyncs after reconnect', async () => {
  const source = await readFile(clientUrl, 'utf8')

  assert.match(source, /const filter=serviceId\?`id=eq\.\$\{serviceId\}`:`cliente_id=eq\.\$\{data\.user\.id\}`/)
  assert.match(source, /filter:`servicio_id=eq\.\$\{serviceId\}`/)
  assert.match(source, /filter:`cliente_id=eq\.\$\{data\.user\.id\}`/)
  assert.match(source, /subscribeRealtimeChannel\(/)
  assert.match(source, /onReconnect:/)
  assert.match(source, /window\.addEventListener\('online',resync\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange',onVisibility\)/)
})

test('provider realtime resyncs authoritative state after reconnect', async () => {
  const source = await readFile(providerUrl, 'utf8')

  assert.match(source, /table:'ofertas_servicio',filter:`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(source, /table:'servicios',filter:`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(source, /table:'pagos',filter:`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(source, /status==='SUBSCRIBED'/)
  assert.match(source, /const handleOnline=\(\)=>\{resync\(\);reconnect\(\);?\}/)
  assert.match(source, /window\.addEventListener\('online',handleOnline\)/)
  assert.match(source, /window\.removeEventListener\('online',handleOnline\)/)
  assert.match(source, /document\.addEventListener\('visibilitychange',onVisibility\)/)
})

test('superadmin Realtime reloads are throttled, coalesced and stop when hidden', async () => {
 const source=await readFile(new URL('../../src/mvp/SuperAdminCommandCenter.tsx',import.meta.url),'utf8')
 assert.match(source,/lastRealtimeReload=useRef\(Date\.now\(\)\)/)
 assert.match(source,/realtimeReloadBusy=useRef\(false\)/)
 assert.match(source,/realtimeReloadPending=useRef\(false\)/)
 assert.match(source,/if\(document\.visibilityState==='hidden'\)return/)
 assert.match(source,/if\(reloadTimer\.current\)return/)
 assert.match(source,/Math\.max\(250,8_000-\(Date\.now\(\)-lastRealtimeReload\.current\)\)/)
 assert.match(source,/realtimeReloadPending\.current=false;refresh\(\)/)
 assert.match(source,/if\(reloadTimer\.current\)clearTimeout\(reloadTimer\.current\);dispose\(\)/)
})
