import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const accept=fs.readFileSync('supabase/migrations/20260904_stage5_harden_atomic_offer_acceptance.sql','utf8')
const cash=fs.readFileSync('supabase/migrations/20260920050000_fix_client_cash_close_sensitive_counter.sql','utf8')
const rating=fs.readFileSync('supabase/migrations/20260930141225_cross_idempotency_rating_uniqueness.sql','utf8')

test('provider acceptance serializes the canonical service claim',()=>{
  assert.match(accept,/for update/i)
  assert.match(accept,/proveedor_id is null/i)
  assert.match(accept,/estado in \('buscando','ofrecido'\)/i)
})

test('cash payment and closure serialize and reconcile retries',()=>{
  assert.match(cash,/where id=p_servicio_id[\s\S]*for update/i)
  assert.match(cash,/where id=v_pago\.id[\s\S]*and estado='pendiente'/i)
  assert.match(cash,/if v_servicio\.estado='completado' and v_pago\.estado='liberado' then[\s\S]*return v_servicio/i)
})

test('ratings have a database uniqueness invariant',()=>{
  assert.match(rating,/unique \(servicio_id, autor_tipo\)/i)
})
