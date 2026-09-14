import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('automatic matching retry preserves live pending offers instead of expiring them', async () => {
  const migration = await read('supabase/migrations/20260914220700_matching_retry_idempotency.sql')

  assert.match(migration, /v_live_count integer/)
  assert.match(migration, /estado='pendiente'\s+and \(expira_at is null or expira_at>now\(\)\)/s)
  assert.match(migration, /if v_live_count>0 then/)
  assert.match(migration, /return query[\s\S]*o\.estado='pendiente'[\s\S]*o\.expira_at is null or o\.expira_at>now\(\)/)

  const guardIndex = migration.indexOf('if v_live_count>0 then')
  const expireIndex = migration.indexOf("update public.ofertas_servicio\n     set estado='expirada'")
  assert.ok(guardIndex >= 0, 'live-offer guard must exist')
  assert.ok(expireIndex > guardIndex, 'live-offer guard must run before expiring pending offers')
})
