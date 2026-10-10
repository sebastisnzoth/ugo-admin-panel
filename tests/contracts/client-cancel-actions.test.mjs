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
  const matching = await read('src/features/client/request/ClientPostConfirmFlow.tsx')
  const bridge = await read('src/features/client/actions/ClientFlowActionsBridge.tsx')
  const service = await read('src/features/client/services/clientActionService.ts')
  const dispatch = await read('src/lib/dispatch/supabaseDispatch.ts')
  assert.match(matching, /flow\.actions\.cancelService\(service\.id\)/)
  assert.match(matching, /await confirm\(\{title:'Cancelar pedido',message:'¿Realmente querés cancelar este pedido\?'/)
  assert.doesNotMatch(matching, /window\.(confirm|prompt|alert)\(/)
  assert.match(matching, /useDialog.*from'\.\.\/\.\.\/\.\.\/mvp\/dialogs'/)
  assert.match(matching, /\{dialog\}/)
  assert.match(bridge, /cancelOwnedClientService\(supabase,userId,serviceId\)/)
  assert.match(service, /\.eq\('id',serviceId\)\.eq\('cliente_id',userId\)/)
  assert.doesNotMatch(service, /order\('created_at'.*limit\(1\)/)
  assert.match(service, /await getDispatchProvider\(\)\.cancel\(owned\.id\)/)
  assert.match(dispatch, /rpc\('cancelar_servicio', \{ p_servicio_id: serviceId \}\)/)
})

test('Activity cancellation uses the same persisted-state recovery path as matching', async () => {
  const [history,service] = await Promise.all([
    read('src/mvp/ServiceHistoryPanel.tsx'),
    read('src/features/client/services/clientActionService.ts'),
  ])
  assert.match(history, /CLIENT_CANCELLABLE_STATES/)
  assert.match(history, /cancelOwnedClientService\(sb,userId,serviceId\)/)
  assert.doesNotMatch(history, /getDispatchProvider\(\)/)
  assert.doesNotMatch(history, /\.rpc\('cancelar_servicio'/)
  assert.match(service, /await getDispatchProvider\(\)\.cancel\(owned\.id\)/)
  assert.match(history, /'Cancelar pedido'/)
})

test('detail cancellation states come from the canonical client action service',async()=>{
 const detail=await read('src/features/client/order/ClientServiceDetail.tsx')
 assert.match(detail,/CLIENT_CANCELLABLE_SERVICE_STATES/)
 assert.match(detail,/const CANCELLABLE=new Set\(CLIENT_CANCELLABLE_SERVICE_STATES\)/)
 assert.doesNotMatch(detail,/new Set\(\['borrador','buscando'/)
})
