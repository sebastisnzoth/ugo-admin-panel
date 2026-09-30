import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const audit=fs.readFileSync('supabase/migrations/20260930134500_client_payment_cash_audit.sql','utf8')
const cash=fs.readFileSync('supabase/migrations/20260920050000_fix_client_cash_close_sensitive_counter.sql','utf8')
const debt=fs.readFileSync('supabase/migrations/20260920070000_cash_provider_ugo_debt_ledger.sql','utf8')
const api=fs.readFileSync('api/pagos/crear.ts','utf8')

test('YA PAGUÉ is server-authoritative and idempotent',()=>{
 assert.match(cash,/confirmar_pago_efectivo_cliente/)
 assert.match(cash,/v_servicio\.estado='completado' and v_pago\.estado='liberado'/)
 assert.match(cash,/where id=v_pago\.id[\s\S]*and estado='pendiente'/)
})
test('cash release emits one transition audit event',()=>{
 assert.match(audit,/old\.estado is distinct from 'liberado'/)
 assert.match(audit,/new\.estado='liberado'/)
 assert.match(audit,/client\.cash_payment\.confirmed/)
 assert.match(audit,/after update of estado on public\.pagos/)
})
test('cash commission debt is unique per payment',()=>{
 assert.match(debt,/pago_id uuid not null unique/)
 assert.match(debt,/on conflict \(pago_id\) do update/)
})
test('digital payment creation reuses existing confirmed or pending provider state',()=>{
 assert.match(api,/if \(confirmed\) return res\.status\(200\)/)
 assert.match(api,/idempotencyKey: `ugo-pix-\$\{servicioId\}`/)
 assert.match(api,/existing\?\.metodo === 'pix'.*existing\?\.estado === 'pendiente'/)
})
