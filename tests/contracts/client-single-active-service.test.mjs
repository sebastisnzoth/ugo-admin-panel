import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('database corrective migration removes the obsolete one-active-service-per-client guard', async () => {
  const [legacy, corrective] = await Promise.all([
    read('supabase/migrations/20260914222000_client_single_active_service_guard.sql'),
    read('supabase/migrations/20260915014000_allow_multiple_client_active_services.sql'),
  ])

  assert.match(legacy, /servicios_cliente_single_active_uidx/)
  assert.match(legacy, /trg_guard_single_active_client_service/)
  assert.match(corrective, /DROP TRIGGER IF EXISTS trg_guard_single_active_client_service/)
  assert.match(corrective, /DROP INDEX IF EXISTS public\.servicios_cliente_single_active_uidx/)
  assert.match(corrective, /DROP FUNCTION IF EXISTS private\.guard_single_active_client_service\(\)/)
  assert.match(corrective, /CREATE INDEX IF NOT EXISTS servicios_cliente_estado_created_idx/)
  assert.doesNotMatch(corrective, /CREATE UNIQUE INDEX/i)
})

test('client cancellation targets one explicit owned service instead of freeing a global active slot', async () => {
  const bridge = await read('src/features/client/actions/ClientFlowActionsBridge.tsx')
  const dispatch = await read('src/lib/dispatch/supabaseDispatch.ts')

  assert.match(bridge, /if\(!serviceId\)return false/)
  assert.match(bridge, /\.eq\('id',serviceId\)\.eq\('cliente_id',userId\)/)
  assert.match(bridge, /getDispatchProvider\(\)\.cancel\(owned\.id\)/)
  assert.doesNotMatch(bridge, /order\('created_at'.*limit\(1\)/)
  assert.match(dispatch, /rpc\('cancelar_servicio', \{ p_servicio_id: serviceId \}\)/)
})
