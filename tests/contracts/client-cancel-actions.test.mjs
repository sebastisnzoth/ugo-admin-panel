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

test('matching cancel button reaches the real dispatch cancellation path', async () => {
  const guided = await read('src/mvp/client/ClientGuidedRequest.tsx')
  const bridge = await read('src/mvp/client/ClientFlowActionsBridge.tsx')
  const dispatch = await read('src/lib/dispatch/supabaseDispatch.ts')
  assert.match(guided, /flow\.actions\.cancelService\(\)/)
  assert.match(bridge, /await getDispatchProvider\(\)\.cancel\(active\.id\)/)
  assert.match(dispatch, /rpc\('cancelar_servicio', \{ p_servicio_id: serviceId \}\)/)
})

test('Services screen offers a real cancellation action for cancellable client requests', async () => {
  const history = await read('src/mvp/ServiceHistoryPanel.tsx')
  assert.match(history, /CLIENT_CANCELLABLE_STATES/)
  assert.match(history, /rpc\('cancelar_servicio',\{p_servicio_id:serviceId\}\)/)
  assert.match(history, /'Cancelar solicitud'/)
  assert.match(history, /type="button" className=\{filter==='todos'/)
})
