import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../../supabase/migrations/20260914202500_restore_cash_review_ordering_guard.sql', import.meta.url), 'utf8')

test('cash services cannot reach client review before the provider confirms receipt', () => {
  assert.match(migration, /old\.estado = 'en_progreso' and new\.estado = 'esperando_aprobacion'/)
  assert.match(migration, /v_pago\.metodo = 'efectivo'/)
  assert.match(migration, /v_pago\.procesador = 'efectivo'/)
  assert.match(migration, /v_pago\.modelo_pago = 'presencial'/)
  assert.match(migration, /v_pago\.estado <> 'liberado'/)
  assert.match(migration, /recepción del efectivo/)
  assert.match(migration, /create trigger trg_guard_cash_before_approval/)
})
