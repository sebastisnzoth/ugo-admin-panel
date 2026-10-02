import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('cliente and proveedor share one canonical marketplace lifecycle contract',async()=>{
  const [lifecycle,shared,providerService,providerData,clientFlow]=await Promise.all([
    read('src/lib/marketplace/lifecycle.ts'),
    read('src/mvp/shared.tsx'),
    read('src/mvp/provider/providerService.ts'),
    read('src/mvp/provider/providerData.tsx'),
    read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  ])

  assert.match(lifecycle,/MATCHING_SERVICE_STATES = \['buscando', 'ofrecido'\]/)
  assert.match(lifecycle,/PROVIDER_LIFECYCLE_ORDER = \[[\s\S]*'asignado'[\s\S]*'en_camino'[\s\S]*'llegado'[\s\S]*'en_progreso'[\s\S]*'esperando_aprobacion'[\s\S]*'completado'/)
  assert.match(lifecycle,/asignado: \['en_camino'\]/)
  assert.match(lifecycle,/en_camino: \['llegado'\]/)
  assert.match(lifecycle,/llegado: \['en_progreso'\]/)
  assert.match(lifecycle,/en_progreso: \['esperando_aprobacion'\]/)

  assert.match(shared,/CLIENT_ACTIVE_SERVICE_STATES/)
  assert.match(shared,/PROVIDER_ACTIVE_SERVICE_STATES/)
  assert.match(shared,/MARKETPLACE_STATUS_LABELS/)
  assert.doesNotMatch(shared,/export const ACTIVE_STATES=\['buscando','ofrecido'/)

  assert.match(providerService,/isAtOrBeyondProviderState/)
  assert.match(providerData,/isAtOrBeyondProviderState/)
  assert.doesNotMatch(providerService,/const LIFECYCLE_ORDER=/)
  assert.doesNotMatch(providerData,/const LIFECYCLE_ORDER=/)

  assert.match(clientFlow,/CLIENT_ACTIVE_SERVICE_STATES/)
  assert.match(clientFlow,/isMatchingServiceState/)
  assert.doesNotMatch(clientFlow,/const MATCHING=new Set/)
})

test('backend remains authoritative for marketplace mutations',async()=>{
  const [providerService,clientActions,lifecycleSql,evidenceSql]=await Promise.all([
    read('src/mvp/provider/providerService.ts'),
    read('src/features/client/services/clientActionService.ts'),
    read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
    read('supabase/migrations/20260911215500_service_evidence_state_guard.sql'),
  ])

  assert.match(providerService,/rpc\('aceptar_oferta'/)
  assert.match(providerService,/rpc\('marcar_llegada_proveedor'/)
  assert.match(providerService,/rpc\('avanzar_servicio'/)
  assert.match(clientActions,/rpc\('aprobar_servicio'/)
  assert.match(clientActions,/rpc\('confirmar_pago_efectivo_cliente'/)

  assert.match(lifecycleSql,/Transición de estado no permitida/)
  assert.match(lifecycleSql,/v_dist_m > 200/)
  assert.match(evidenceSql,/Sólo el proveedor asignado puede registrar evidencia operacional/)
})
