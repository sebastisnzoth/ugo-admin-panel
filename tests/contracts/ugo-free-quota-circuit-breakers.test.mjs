import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = path => readFileSync(new URL('../../'+path,import.meta.url),'utf8')

test('provider Realtime coalesces GETs and reconnects with bounded backoff',()=>{
 const source=read('src/mvp/provider/useProviderRealtime.ts')
 assert.match(source,/lastSyncAt<30_000/)
 assert.match(source,/Math\.min\(120_000,3_000\*2\*\*Math\.min\(backpressure\.current\.failures,5\)\)/)
 assert.match(source,/reconnectTimer!==undefined/)
 assert.match(source,/window\.setInterval\([\s\S]*?,60_000\)/)
 assert.match(source,/if\(!alive\|\|document\.visibilityState!=='visible'\|\|!navigator\.onLine\)return/)
 assert.doesNotMatch(source,/channel_failed'\);resync\(\);reconnect\(\)/)
 assert.match(source,/const handleOnline=\(\)=>\{resync\(\);reconnect\(\);?\}/)
})
test('client payment Realtime avoids repeated query and incident report storms',()=>{
 const source=read('src/features/client/payments/ClientPaymentChoice.tsx')
 assert.match(source,/refreshLastAt\.current<30_000/)
 assert.match(source,/reconnectFailures\.current===1/)
 assert.match(source,/Math\.min\(120_000,3_000\*2\*\*Math\.min\(reconnectFailures\.current,5\)\)/)
 assert.match(source,/reconnectTimer!==undefined/)
})
test('normal Core CI never persists probe results into the shared free TEST database',()=>{
 const probe=read('scripts/openrouter-autonomy-probe.mjs')
 const ci=read('.github/workflows/core-ci.yml')
 assert.match(probe,/UGO_OPENROUTER_PROBE_PERSIST_TEST==='1'/)
 assert.match(ci,/UGO_OPENROUTER_PROBE_PERSIST_TEST: '0'/)
 assert.match(probe,/su\.includes\('tmossnqfwfwjrtzwcbmm'\)/)
})
