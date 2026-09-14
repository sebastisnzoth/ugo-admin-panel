import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('database enforces one active service per client with a friendly guard', async () => {
  const migration = await read('supabase/migrations/20260914222000_client_single_active_service_guard.sql')

  assert.match(migration, /create unique index if not exists servicios_cliente_single_active_uidx/)
  assert.match(migration, /where estado in \('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'\)/)
  assert.match(migration, /create or replace function private\.guard_single_active_client_service\(\)/)
  assert.match(migration, /Ya tenés un servicio activo\. Seguilo o cancelalo antes de crear otro pedido\./)
  assert.match(migration, /create trigger trg_guard_single_active_client_service/)
  assert.match(migration, /before insert or update of cliente_id, estado on public\.servicios/)
})

test('client cancellation remains the supported way to free the active-service slot', async () => {
  const bridge = await read('src/mvp/client/ClientFlowActionsBridge.tsx')
  const dispatch = await read('src/lib/dispatch/supabaseDispatch.ts')

  assert.match(bridge, /getDispatchProvider\(\)\.cancel\(active\.id\)/)
  assert.match(dispatch, /rpc\('cancelar_servicio', \{ p_servicio_id: serviceId \}\)/)
})
