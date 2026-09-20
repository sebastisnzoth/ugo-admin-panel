import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../../supabase/migrations/20260918_provider_multi_jobs_cash_close_flow.sql', import.meta.url), 'utf8')

test('cash services reach client review before payment confirmation and close only after client confirms payment', () => {
  assert.match(migration, /create or replace function private\.guard_cash_before_approval\(\)/)
  assert.match(migration, /return new;/)
  assert.match(migration, /create or replace function public\.confirmar_pago_efectivo_cliente\(p_servicio_id uuid\)/)
  assert.match(migration, /v_servicio\.estado<>'esperando_aprobacion'/)
  assert.match(migration, /trabajo_aprobado_at/)
  assert.match(migration, /cliente_pago_efectivo_at/)
  assert.match(migration, /'pago_efectivo_confirmado'/)
  assert.match(migration, /'El cliente pagó'/)
  assert.match(migration, /set estado='completado'/)
})


test('cash approval notifications demand attention from both client and provider',async()=>{
 const[center,edge]=await Promise.all([
  readFile(new URL('../../src/mvp/NotificationCenter.tsx',import.meta.url),'utf8'),
  readFile(new URL('../../supabase/functions/push-dispatch/index.ts',import.meta.url),'utf8'),
 ])
 assert.match(center,/PROVIDER_ATTENTION_TYPES=new Set\([^\n]*'trabajo_aprobado'/)
 assert.match(center,/CLIENT_ATTENTION_TYPES=new Set\([^\n]*'pago_efectivo_pendiente'/)
 assert.match(edge,/HIGH_URGENCY_TYPES=new Set\([^\n]*'trabajo_aprobado'[^\n]*'pago_efectivo_pendiente'/)
})
