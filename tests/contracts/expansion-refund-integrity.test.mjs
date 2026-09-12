import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL('../../supabase/migrations/20260912222000_expansion_refund_integrity.sql', import.meta.url)
const webhookUrl = new URL('../../api/pagos/webhook.ts', import.meta.url)

test('expansion refund is server-authoritative and idempotent', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /auth\.role\(\) <> 'service_role'/)
  assert.match(sql, /for update/i)
  assert.match(sql, /ajuste_estado = 'reembolsado' and v_row\.pago_estado = 'pendiente_ajuste'/)
  assert.match(sql, /v_row\.ajuste_pago_externo_id <> p_pago_externo_id/)
  assert.match(sql, /set tarifa = round\(\(coalesce\(tarifa, 0\) - v_monto\)/)
  assert.match(sql, /comision_ugo = round\(\(coalesce\(comision_ugo, 0\) - v_comision\)/)
  assert.match(sql, /ganancia_proveedor = round\(\(coalesce\(ganancia_proveedor, 0\) - v_neto\)/)
  assert.match(sql, /ajuste_estado = 'reembolsado'/)
  assert.match(sql, /security definer/i)
  assert.match(sql, /set search_path to 'public', 'private', 'pg_temp'/i)
  assert.match(sql, /revoke all on function public\.reembolsar_pago_ampliacion\(uuid,text,numeric,text\) from public, anon, authenticated/i)
  assert.match(sql, /grant execute on function public\.reembolsar_pago_ampliacion\(uuid,text,numeric,text\) to service_role/i)
})

test('Mercado Pago refund webhook delegates expansion reversal to backend RPC', async () => {
  const source = await readFile(webhookUrl, 'utf8')

  assert.match(source, /paymentData\.status === 'refunded'/)
  assert.match(source, /sb\.rpc\('reembolsar_pago_ampliacion'/)
  assert.match(source, /estado: 'reembolso_pendiente'/)
  assert.match(source, /estado: 'reembolsado'/)
})
