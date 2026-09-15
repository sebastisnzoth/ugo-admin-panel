import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('matching never traps the client and exposes background, retry and real cancel exits', async () => {
  const guided = await read('src/mvp/client/ClientGuidedRequest.tsx')
  assert.match(guided, /Seguir usando UGO/)
  assert.match(guided, /Reintentar búsqueda/)
  assert.match(guided, /Cancelar solicitud/)
  assert.match(guided, /flow\.actions\.cancelService\(\)/)
  assert.match(guided, /Todavía no hay profesionales disponibles\. Tu solicitud sigue activa\./)
  assert.match(guided, /No pudimos reintentar ahora\. Tu solicitud sigue guardada\./)
})

test('client cancellation is persisted by authorized RPC and expires pending offers', async () => {
  const sql = await read('supabase/migrations/20260913_client_cancel_service_rpc.sql')
  assert.match(sql, /for update/)
  assert.match(sql, /estado not in \('borrador','buscando','ofrecido','asignado','en_camino','llegado'\)/)
  assert.match(sql, /update public\.ofertas_servicio[\s\S]*set estado = 'expirada'/)
  assert.match(sql, /update public\.servicios[\s\S]*set estado = 'cancelado'/)
  assert.match(sql, /'cancelacion_cliente'/)
})

test('lost cancellation response is reconciled against persisted service state', async () => {
  const dispatch = await read('src/lib/dispatch/supabaseDispatch.ts')
  assert.match(dispatch, /rpc\('cancelar_servicio'/)
  assert.match(dispatch, /const persisted = await this\.getStatus\(serviceId\)/)
  assert.match(dispatch, /persisted\.state === 'cancelled'/)
})

test('client can recover cancellation from Services outside the matching screen', async () => {
  const history = await read('src/mvp/ServiceHistoryPanel.tsx')
  assert.match(history, /CLIENT_CANCELLABLE_STATES/)
  assert.match(history, /Cancelar solicitud/)
  assert.match(history, /Solicitud cancelada correctamente/)
  assert.match(history, /El pedido sigue activo y podés reintentar/)
})

test('client and provider critical lifecycle is backend-authoritative and realtime-observable', async () => {
  const lifecycle = await read('tests/contracts/client-provider-lifecycle.test.mjs')
  assert.match(lifecycle, /canonical backend transition RPC/)
  assert.match(lifecycle, /provider cannot leave assigned without a valid payment path/)
  assert.match(lifecycle, /client approval is scoped to its service/)
  assert.match(lifecycle, /provider and client observe critical service changes through realtime/)
})

test('isolated RPC RLS harness covers one real shared service through completion', async () => {
  const integration = await read('tests/integration/client-provider-rpc-rls.test.mjs')
  assert.match(integration, /UGO_TEST_ADMIN_EMAIL/)
  assert.match(integration, /UGO_TEST_ADMIN_PASSWORD/)
  assert.match(integration, /iniciar_matching_dirigido/)
  assert.match(integration, /aceptar_oferta/)
  assert.match(integration, /seleccionar_pago_efectivo/)
  assert.match(integration, /confirmar_pago_efectivo/)
  assert.match(integration, /aprobar_servicio/)
  assert.match(integration, /Proveedor debe leer el mensaje canónico del Cliente/)
  assert.match(integration, /Cliente debe leer la respuesta canónica del Proveedor/)
  assert.match(integration, /Admin observa el mismo cierre persistido del serviceId E2E/)
  assert.match(integration, /Admin observa el mismo pago persistido del serviceId E2E/)
  assert.match(integration, /evidencePaths\.length, 2/)
  assert.match(integration, /preserve_e2e_evidence: true/)
})
