import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../../src/lib/dispatch/supabaseDispatch.ts', import.meta.url), 'utf8')

test('matching RPC errors reconcile persisted state before surfacing failure', () => {
  assert.match(source, /recoverAcceptedDispatch\(serviceId: string, originalError: unknown\)/)
  assert.match(source, /const persisted = await this\.getStatus\(serviceId\)/)
  assert.match(source, /persisted\.state === 'offering' \|\| persisted\.state === 'matched'/)
  assert.match(source, /throw originalError/)
})

test('regular and directed matching both use persisted-state recovery', () => {
  const uses = source.match(/return this\.recoverAcceptedDispatch\(request\.serviceId, error\)/g) || []
  assert.equal(uses.length, 2)
  assert.match(source, /rpc\('iniciar_matching_dirigido'/)
  assert.match(source, /rpc\('iniciar_matching'/)
})

test('recovery does not treat pending or failed persisted state as success', () => {
  const recovery = source.match(/private async recoverAcceptedDispatch[\s\S]*?\n  }\n\n  async start/)?.[0] || ''
  assert.doesNotMatch(recovery, /persisted\.state === 'pending'/)
  assert.doesNotMatch(recovery, /persisted\.state === 'failed'/)
})
