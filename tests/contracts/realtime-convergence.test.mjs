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

test('superadmin coalesces repeated realtime events in execution', async () => {
 const source=await readFile(new URL('../../src/mvp/SuperAdminCommandCenter.tsx',import.meta.url),'utf8')
 const match=source.match(/const refresh=\(\)=>\{[\s\S]*?\};const channel=db\.channel/)
 assert.ok(match,'refresh handler must be found')
 let now=10_000,calls=0
 const timers=[]
 const reloadTimer={current:null},lastRealtimeReload={current:0},realtimeReloadBusy={current:false},realtimeReloadPending={current:false}
 const load=()=>{calls++;return Promise.resolve()}
 const setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length}
 const refresh=new Function('document','reloadTimer','lastRealtimeReload','realtimeReloadBusy','realtimeReloadPending','load','setTimeout','Date',match[0].replace(/;const channel=db\.channel$/,'')+';return refresh')(
  {visibilityState:'visible'},reloadTimer,lastRealtimeReload,realtimeReloadBusy,realtimeReloadPending,load,setTimeout,{now:()=>now})
 refresh();refresh();refresh()
 assert.equal(timers.length,1,'event burst must schedule only one DB reload')
 assert.equal(timers[0].delay,250)
 timers[0].fn()
 await Promise.resolve();await Promise.resolve()
 assert.equal(calls,1)
 now=10_500;refresh()
 assert.equal(timers.length,2)
 assert.equal(timers[1].delay,7_500,'subsequent event must honor eight-second minimum spacing')
 assert.equal(calls,1,'throttled event must not run DB query early')
})
