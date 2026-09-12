import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL(
  '../../supabase/migrations/20260912214000_dispute_message_role_integrity_guard.sql',
  import.meta.url,
)

const sql = await readFile(migrationUrl, 'utf8')

test('dispute message inserts bind autor_id to auth.uid()', () => {
  assert.match(sql, /autor_id\s*=\s*auth\.uid\(\)/i)
})

test('only admins can claim autor_rol=admin', () => {
  assert.match(sql, /autor_rol\s*=\s*'admin'\s+and\s+private\.is_admin\(auth\.uid\(\)\)/i)
})

test('client and provider roles are bound to dispute ownership', () => {
  assert.match(sql, /autor_rol\s*=\s*'cliente'\s+and\s+d\.cliente_id\s*=\s*auth\.uid\(\)/i)
  assert.match(sql, /autor_rol\s*=\s*'proveedor'\s+and\s+d\.proveedor_id\s*=\s*auth\.uid\(\)/i)
})
