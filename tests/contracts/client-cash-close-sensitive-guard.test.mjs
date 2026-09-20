import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration=await readFile(new URL('../../supabase/migrations/20260920050000_fix_client_cash_close_sensitive_counter.sql',import.meta.url),'utf8')

test('client-owned completion never writes another user protected profile',()=>{
 assert.match(migration,/create or replace function public\.confirmar_pago_efectivo_cliente\(p_servicio_id uuid\)/)
 assert.match(migration,/create or replace function private\.aprobar_servicio_impl\(p_servicio_id uuid\)/)
 assert.match(migration,/set estado='completado'/)
 assert.match(migration,/cliente_pago_efectivo_at/)
 assert.doesNotMatch(migration,/update public\.usuarios[\s\S]*servicios_completados/)
 assert.doesNotMatch(migration,/set servicios_completados/)
})

test('cash close remains client-owned and idempotent after work approval',()=>{
 assert.match(migration,/v_servicio\.cliente_id<>auth\.uid\(\)/)
 assert.match(migration,/trabajo_aprobado_at/)
 assert.match(migration,/v_pago\.estado not in \('pendiente','liberado'\)/)
 assert.match(migration,/v_servicio\.estado='completado' and v_pago\.estado='liberado'/)
 assert.match(migration,/'pago_efectivo_confirmado'/)
 assert.match(migration,/'El cliente pagó'/)
})
