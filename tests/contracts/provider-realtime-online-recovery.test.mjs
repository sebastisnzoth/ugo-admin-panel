import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = readFileSync(new URL('../../src/mvp/provider/useProviderRealtime.ts', import.meta.url), 'utf8')

test('provider online recovery attaches one handler and detaches the same handler', () => {
 assert.match(source, /const handleOnline=\(\)=>\{resync\(\);reconnect\(\);?\}/)
 assert.equal((source.match(/addEventListener\('online'/g) ?? []).length, 1)
 assert.equal((source.match(/removeEventListener\('online'/g) ?? []).length, 1)
 assert.match(source, /addEventListener\('online',handleOnline\)/)
 assert.match(source, /removeEventListener\('online',handleOnline\)/)
})

test('realtime reconnect resubscribes without signing the provider out', () => {
 assert.match(source, /setChannelEpoch\(value=>value\+1\)/)
 assert.match(source, /status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'\|\|status==='CLOSED'/)
 assert.match(source, /supabase\.removeChannel\(ch\)/)
 assert.doesNotMatch(source, /(?:auth\.)?signOut\s*\(/)
})

test('provider offer and job notifications remain subscribed', () => {
 for (const table of ['ofertas_servicio','servicios']) {
  assert.ok(source.includes(`table:'${table}'`), `Missing ${table} subscription`)
 }
 assert.match(source, /filter:`proveedor_id=eq\.\$\{userId\}`/)
 assert.match(source, /status==='SUBSCRIBED'/)
})
