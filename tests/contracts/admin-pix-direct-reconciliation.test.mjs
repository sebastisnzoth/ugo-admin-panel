import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260916102000_admin_pix_direto_reconciliation.sql','utf8')
const panel=fs.readFileSync('src/mvp/PixReconciliationPanel.tsx','utf8')

test('direct PIX reconciliation is admin-only, row-locked and real-only',()=>{
 assert.match(migration,/create or replace function public\.conciliar_pix_direto/i)
 assert.match(migration,/private\.is_admin\(v_uid\)/)
 assert.match(migration,/where id = p_pago_id\s+for update/i)
 assert.match(migration,/v_pago\.ambiente <> 'real'/)
 assert.match(migration,/v_pago\.metodo <> 'pix_direto'/)
 assert.match(migration,/v_pago\.pix_informado_at is null/)
 assert.match(migration,/v_pago\.estado <> 'pendiente'/)
 assert.match(migration,/revoke all on function public\.conciliar_pix_direto\(uuid,boolean,text,text\) from public, anon/i)
 assert.match(migration,/grant execute on function public\.conciliar_pix_direto\(uuid,boolean,text,text\) to authenticated, service_role/i)
})

test('approval requires bank reference, retains payment and records audit trail',()=>{
 assert.match(migration,/PIX_REFERENCE_REQUIRED/)
 assert.match(migration,/set estado = 'retenido'/)
 assert.match(migration,/pix_e2e_id = v_ref/)
 assert.match(migration,/pix_conciliado_at = now\(\)/)
 assert.match(migration,/pix_conciliado_por = v_uid/)
 assert.match(migration,/admin\.pix_direto\.approved/)
 assert.match(migration,/pix_conciliado/)
})

test('rejection requires a reason and records a failed reconciled payment',()=>{
 assert.match(migration,/PIX_REJECTION_REASON_REQUIRED/)
 assert.match(migration,/set estado = 'fallido'/)
 assert.match(migration,/admin\.pix_direto\.rejected/)
 assert.match(migration,/pix_rechazado/)
})

test('admin UI filters real PIX, confirms destructive decisions and surfaces errors',()=>{
 assert.match(panel,/\.eq\('ambiente','real'\)\.eq\('metodo','pix_direto'\)/)
 assert.match(panel,/window\.confirm/)
 assert.match(panel,/referencia\/E2E bancaria real/i)
 assert.match(panel,/al menos 8 caracteres/i)
 assert.match(panel,/role="alert"/)
 assert.match(panel,/conciliar_pix_direto/)
})
