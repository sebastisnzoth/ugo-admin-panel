import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('client cancellation is backed by an authenticated RPC', async () => {
  const migration = await read('supabase/migrations/20260913_client_cancel_service_rpc.sql')
  assert.match(migration, /create or replace function public\.cancelar_servicio\(p_servicio_id uuid\)/)
  assert.match(migration, /v_servicio\.cliente_id <> v_actor/)
  assert.match(migration, /set estado = 'cancelado'/)
  assert.match(migration, /grant execute on function public\.cancelar_servicio\(uuid\) to authenticated/)
})

test('matching cancel button reaches the real dispatch cancellation path for one explicit service id', async () => {
  const guided = await read('src/mvp/client/ClientGuidedRequest.tsx')
  const bridge = await read('src/features/client/actions/ClientFlowActionsBridge.tsx')
  const service = await read('src/features/client/services/clientActionService.ts')
  const dispatch = await read('src/lib/dispatch/supabaseDispatch.ts')
  assert.match(guided, /flow\.actions\.cancelService\(currentCreatingServiceId\)/)
  assert.match(bridge, /cancelOwnedClientService\(supabase,userId,serviceId\)/)
  assert.match(service, /\.eq\('id',serviceId\)\.eq\('cliente_id',userId\)/)
  assert.doesNotMatch(service, /order\('created_at'.*limit\(1\)/)
  assert.match(service, /await getDispatchProvider\(\)\.cancel\(owned\.id\)/)
  assert.match(dispatch, /rpc\('cancelar_servicio', \{ p_servicio_id: serviceId \}\)/)
})

test('Activity cancellation uses the same persisted-state recovery path as matching', async () => {
  const history = await read('src/mvp/ServiceHistoryPanel.tsx')
  assert.match(history, /CLIENT_CANCELLABLE_STATES/)
  assert.match(history, /rows\.find\(row=>row\.id===serviceId&&row\.cliente_id===userId\)/)
  assert.match(history, /await getDispatchProvider\(\)\.cancel\(serviceId\)/)
  assert.doesNotMatch(history, /\.rpc\('cancelar_servicio'/)
  assert.match(history, /'Cancelar pedido'/)
})
