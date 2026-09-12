import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL('../../supabase/migrations/20260912_guard_demo_payment_to_demo_client.sql', import.meta.url)

test('demo payment guard requires authenticated owner and demo client', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /v_servicio\.cliente_id<>auth\.uid\(\)/)
  assert.match(sql, /private\.is_demo_account\(v_servicio\.cliente_id,'cliente'\)/)
  assert.match(sql, /v_proveedor\.es_demo/)
  assert.match(sql, /security definer/i)
  assert.match(sql, /set search_path to 'public', 'private', 'pg_temp'/i)
})
