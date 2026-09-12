import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL(
  '../../supabase/migrations/20260912215500_push_subscription_ownership_guard.sql',
  import.meta.url,
)

const sql = await readFile(migrationUrl, 'utf8')

test('push subscription guard locks and checks the existing endpoint owner', () => {
  assert.match(sql, /select\s+usuario_id[\s\S]*where\s+endpoint\s*=\s*p_endpoint[\s\S]*for\s+update/i)
  assert.match(sql, /v_owner\s+is\s+not\s+null\s+and\s+v_owner\s*<>\s*v_uid/i)
})

test('endpoint conflict refreshes keys without reassigning usuario_id', () => {
  const conflict = sql.match(/on\s+conflict\s*\(endpoint\)\s+do\s+update\s+set([\s\S]*?)returning/i)?.[1] || ''
  assert.ok(conflict, 'Debe existir un ON CONFLICT(endpoint) controlado')
  assert.doesNotMatch(conflict, /usuario_id\s*=/i)
  assert.match(conflict, /p256dh\s*=\s*excluded\.p256dh/i)
  assert.match(conflict, /auth\s*=\s*excluded\.auth/i)
})

test('push subscription RPC remains authenticated-only', () => {
  assert.match(sql, /revoke\s+all\s+on\s+function[\s\S]*from\s+public/i)
  assert.match(sql, /grant\s+execute\s+on\s+function[\s\S]*to\s+authenticated/i)
})
