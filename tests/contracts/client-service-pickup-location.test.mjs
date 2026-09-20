import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8')

test('client dispatch persists pickup on the exact service before matching', async () => {
  const [dispatch, sql] = await Promise.all([
    read('src/lib/dispatch/supabaseDispatch.ts'),
    read('supabase/migrations/20260920162500_client_service_pickup_rpc.sql')
  ])
  assert.match(dispatch, /rpc\('guardar_ubicacion_servicio_cliente'/)
  assert.match(dispatch, /await persistPickup\(request\.serviceId, request\.pickup \|\| storedPickup\(\)\)/)
  assert.match(dispatch, /await persistPickup[\s\S]*rpc\('iniciar_matching'/)
  assert.match(sql, /create or replace function public\.guardar_ubicacion_servicio_cliente/)
  assert.match(sql, /s\.cliente_id = v_uid/)
  assert.match(sql, /st_makepoint\(p_lng,p_lat\)/)
  assert.match(sql, /ubicacion_cliente/)
  assert.match(sql, /grant execute on function public\.guardar_ubicacion_servicio_cliente/)
})

test('client service pickup rejects invalid or terminal updates', async () => {
  const sql = await read('supabase/migrations/20260920162500_client_service_pickup_rpc.sql')
  assert.match(sql, /p_lat < -90 or p_lat > 90/)
  assert.match(sql, /p_lng < -180 or p_lng > 180/)
  assert.match(sql, /v_estado in \('completado','cancelado','rechazado'\)/)
})
