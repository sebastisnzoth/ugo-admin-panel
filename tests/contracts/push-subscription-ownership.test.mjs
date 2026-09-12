import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL(
  '../../supabase/migrations/20260912215500_push_subscription_ownership_guard.sql',
  import.meta.url,
)

const sql = await readFile(migrationUrl, 'utf8')

function assertEndpointConflictOwnership(source) {
  const conflict = source.match(/on\s+conflict\s*\(endpoint\)\s+do\s+update\s+set\b([\s\S]*?)\bwhere\b([\s\S]*?)\breturning\b/i)
  assert.ok(conflict, 'Debe existir un ON CONFLICT(endpoint) con SET y WHERE separados')
  const [, assignments, ownershipPredicate] = conflict
  assert.doesNotMatch(assignments, /\busuario_id\b/i, 'El SET no debe reasignar el dueño del endpoint')
  assert.match(assignments, /p256dh\s*=\s*excluded\.p256dh/i)
  assert.match(assignments, /auth\s*=\s*excluded\.auth/i)
  assert.match(ownershipPredicate, /^\s*public\.push_suscripciones\.usuario_id\s*=\s*v_uid\s*$/i)
  assert.match(source, /if\s+v_id\s+is\s+null\s+then[\s\S]*pertenece a otra cuenta/i)
}

test('push subscription guard locks and checks the existing endpoint owner', () => {
  assert.match(sql, /select\s+usuario_id[\s\S]*where\s+endpoint\s*=\s*p_endpoint[\s\S]*for\s+update/i)
  assert.match(sql, /v_owner\s+is\s+not\s+null\s+and\s+v_owner\s*<>\s*v_uid/i)
})

test('endpoint conflict refreshes keys only for the same owner', () => {
  assertEndpointConflictOwnership(sql)
})

for (const [name, pattern, replacement] of [
  ['owner reassignment in SET', /on conflict\(endpoint\) do update set/i, 'on conflict(endpoint) do update set usuario_id=excluded.usuario_id,'],
  ['missing ownership predicate', /where public\.push_suscripciones\.usuario_id = v_uid/i, ''],
  ['ownership predicate bypass', /where public\.push_suscripciones\.usuario_id = v_uid/i, 'where public.push_suscripciones.usuario_id = v_uid or true'],
]) {
  test(`endpoint contract rejects ${name}`, () => {
    const mutated = sql.replace(pattern, replacement)
    assert.notEqual(mutated, sql, 'La mutación debe alterar el contrato que se está probando')
    assert.throws(() => assertEndpointConflictOwnership(mutated), assert.AssertionError)
  })
}

test('push subscription RPC remains authenticated-only', () => {
  assert.match(sql, /revoke\s+all\s+on\s+function[\s\S]*from\s+public/i)
  assert.match(sql, /grant\s+execute\s+on\s+function[\s\S]*to\s+authenticated/i)
})
