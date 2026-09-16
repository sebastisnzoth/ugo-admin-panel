import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../../src/lib/dispatch/supabaseDispatch.ts', import.meta.url), 'utf8')

test('matching RPC errors reconcile persisted state before surfacing failure', () => {
  assert.match(source, /recoverAcceptedDispatch\(serviceId: string, originalError: unknown\)/)
  assert.match(source, /const persisted = await readPersistedStatus\(serviceId\)/)
  assert.match(source, /persisted\?\.state === 'offering' \|\| persisted\?\.state === 'matched'/)
  assert.match(source, /throw originalError/)
})

test('matching Sentinel only emits P0 after a persisted non-matched state is confirmed', () => {
  const recovery = source.match(/private async recoverAcceptedDispatch[\s\S]*?\n  }\n\n  async start/)?.[0] || ''
  assert.match(recovery, /if \(persisted\) \{[\s\S]*eventType: 'client_matching_error'[\s\S]*severity: 'P0'[\s\S]*action: 'client\.request\.matching'/)
  assert.match(recovery, /else \{[\s\S]*eventType: 'client_matching_recovery_unverified'[\s\S]*severity: 'P1'[\s\S]*action: 'client\.request\.matching\.recovery'/)
})

test('regular and directed matching both use persisted-state recovery', () => {
  const uses = source.match(/return this\.recoverAcceptedDispatch\(request\.serviceId, error\)/g) || []
  assert.equal(uses.length, 2)
  assert.match(source, /rpc\('iniciar_matching_dirigido'/)
  assert.match(source, /rpc\('iniciar_matching'/)
})

test('recovery does not treat pending or failed persisted state as success', () => {
  const recovery = source.match(/private async recoverAcceptedDispatch[\s\S]*?\n  }\n\n  async start/)?.[0] || ''
  assert.doesNotMatch(recovery, /persisted\?\.state === 'pending'/)
  assert.doesNotMatch(recovery, /persisted\?\.state === 'failed'/)
})

test('cancel recovery distinguishes confirmed failure from unverifiable persistence', () => {
  const cancel = source.match(/async cancel\(serviceId: string\)[\s\S]*?\n  }\n\n  async getStatus/)?.[0] || ''
  assert.match(cancel, /const persisted = await readPersistedStatus\(serviceId\)/)
  assert.match(cancel, /if \(persisted\?\.state === 'cancelled'\) return/)
  assert.match(cancel, /if \(persisted\) \{[\s\S]*eventType: 'client_cancel_error'[\s\S]*severity: 'P0'/)
  assert.match(cancel, /else \{[\s\S]*eventType: 'client_cancel_recovery_unverified'[\s\S]*severity: 'P1'/)
})
