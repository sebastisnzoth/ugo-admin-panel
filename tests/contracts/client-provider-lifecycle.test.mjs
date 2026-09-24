import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider uses the canonical backend transition RPC instead of local-only state',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 assert.match(service,/rpc\('avanzar_servicio'/)
 assert.doesNotMatch(service,/from\('servicios'\)\.update\(\{estado:/)
})

test('backend allows only the canonical provider lifecycle transitions',async()=>{
 const sql=await read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql')
 assert.match(sql,/v_servicio\.estado='asignado' and p_estado='en_camino'/)
 assert.match(sql,/v_servicio\.estado='en_camino' and p_estado='llegado'/)
 assert.match(sql,/v_servicio\.estado='llegado' and p_estado='en_progreso'/)
 assert.match(sql,/v_servicio\.estado='en_progreso' and p_estado='esperando_aprobacion'/)
 assert.match(sql,/Transición de estado no permitida/)
})

test('client cannot forge provider assignment, lifecycle or settlement fields during service creation',async()=>{
 const sql=await read('supabase/migrations/20260912203500_service_insert_integrity_guard.sql')
 assert.match(sql,/private\.is_admin\(\(select auth\.uid\(\)\)\)/)
 assert.match(sql,/cliente_id\s*=\s*\(select auth\.uid\(\)\)/)
 assert.match(sql,/proveedor_id is null/)
 assert.match(sql,/estado in \('borrador','buscando'\)/)
 assert.match(sql,/aceptado_at is null/)
 assert.match(sql,/iniciado_at is null/)
 assert.match(sql,/completado_at is null/)
 assert.match(sql,/comision_ugo is null/)
 assert.match(sql,/ganancia_proveedor is null/)
 assert.doesNotMatch(sql,/revoke update.*authenticated/i)
})

test('pending opportunity providers only get the redacted RPC, not the full service row',async()=>{
 const [privacy,providerService]=await Promise.all([
  read('supabase/migrations/20260912205500_service_offer_privacy_guard.sql'),
  read('src/mvp/provider/providerService.ts'),
 ])
 assert.match(privacy,/alter policy servicios_select/)
 assert.match(privacy,/cliente_id = \(select auth\.uid\(\)\)/)
 assert.match(privacy,/proveedor_id = \(select auth\.uid\(\)\)/)
 assert.doesNotMatch(privacy,/proveedor_tiene_oferta/)
 assert.match(providerService,/rpc\('obtener_ofertas_proveedor'/)
})

test('request evidence access expires with the opportunity unless provider is assigned',async()=>{
 const sql=await read('supabase/migrations/20260912204500_request_evidence_offer_access_guard.sql')
 assert.match(sql,/alter policy evidencia_solicitud_participantes_select/)
 assert.match(sql,/alter policy request_evidence_participant_select/)
 assert.match(sql,/s\.proveedor_id = \(select auth\.uid\(\)\)/)
 assert.match(sql,/o\.estado = 'pendiente'/)
 assert.match(sql,/o\.expira_at is null or o\.expira_at > now\(\)/)
 assert.match(sql,/private\.is_admin\(\(select auth\.uid\(\)\)\)/)
})

test('request photos are optional but any supplied evidence stays bound to its explicit draft',async()=>{
 const [need,post,binding]=await Promise.all([
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  read('supabase/migrations/20260911_request_evidence_draft_binding.sql'),
 ])
 assert.match(post,/request_draft_id:requestDraftId/)
 assert.match(need,/Podés continuar sin fotos/)
 assert.match(need,/disabled=\{!canContinue\|\|photoBusy\}/)
 assert.doesNotMatch(need,/photoCount<1/)
 assert.match(binding,/draft_id=v_draft_id/)
 assert.match(binding,/if v_draft_raw is null then[\s\S]*return new/)
})

test('provider cannot leave assigned without a valid payment path',async()=>{
 const [providerData,backend]=await Promise.all([
  read('src/mvp/provider/providerData.tsx'),
  read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
 ])
 assert.match(providerData,/service\.estado==='asignado'&&!funded&&!cashSelected/)
 assert.match(backend,/p\.estado='retenido'/)
 assert.match(backend,/p\.metodo='efectivo'[\s\S]*p\.modelo_pago='presencial'/)
})

test('cash completion is approved and paid by the client after provider marks work ready',async()=>{
 const [providerData,activeJob,clientReview,backend]=await Promise.all([
  read('src/mvp/provider/providerData.tsx'),
  read('src/mvp/provider/ProviderActiveJob.tsx'),
  read('src/features/client/order/ClientCompletionReview.tsx'),
  read('supabase/migrations/20260920050000_fix_client_cash_close_sensitive_counter.sql'),
 ])
 const completeService=providerData.slice(providerData.indexOf('const completeService'),providerData.indexOf('const cancelService'))
 assert.match(activeJob,/TRABAJO LISTO/)
 assert.match(activeJob,/Primero el cliente confirma el trabajo\. Después UGO le muestra cuánto pagarte/)
 assert.doesNotMatch(activeJob,/confirmCash/)
 assert.doesNotMatch(providerData,/confirmCash/)
 assert.match(completeService,/advanceProviderService\(supabase,serviceId,'esperando_aprobacion'\)/)
 assert.match(clientReview,/rpc\('aprobar_servicio'/)
 assert.match(clientReview,/rpc\('confirmar_pago_efectivo_cliente'/)
 assert.match(clientReview,/YA PAGUÉ/)
 assert.match(backend,/create or replace function public\.confirmar_pago_efectivo_cliente/)
 assert.match(backend,/'pago_efectivo_confirmado'/)
 assert.match(backend,/'El cliente pagó'/)
 assert.match(backend,/v_servicio\.estado<>'esperando_aprobacion'/)
 assert.match(backend,/trabajo_aprobado_at/)
 assert.match(backend,/v_pago\.estado not in \('pendiente','liberado'\)/)
})

test('provider simple flow keeps automatic arrival with a manual fallback',async()=>{
 const [activeJob,root,tracker]=await Promise.all([
  read('src/mvp/provider/ProviderActiveJob.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('src/mvp/ProviderLocationTracker.tsx'),
 ])
 assert.match(activeJob,/ESTOY YENDO/)
 assert.match(activeJob,/actionLabel="EMPEZAR TRABAJO"/)
 assert.match(activeJob,/YA LLEGUÉ/)
 assert.match(root,/onAutoArrival=/)
 assert.match(tracker,/ARRIVAL_RADIUS_M=200/)
 assert.match(tracker,/autoArrivalRef\.current/)
})

test('provider opportunity UI is problem-first and avoids exposing ranking bureaucracy',async()=>{
 const opportunities=await read('src/mvp/provider/ProviderOpportunities.tsx')
 assert.match(opportunities,/ACEPTAR/)
 assert.match(opportunities,/No puedo tomarlo/i)
 assert.match(opportunities,/¿Lo podés resolver\?/)
 assert.doesNotMatch(opportunities,/COMPATIBILIDAD/)
 assert.doesNotMatch(opportunities,/TU VISITA BASE/)
})

test('client approval is scoped to its service and completed review keeps its exact service evidence visible',async()=>{
 const [client,backend]=await Promise.all([
  read('src/features/client/order/ClientCompletionReview.tsx'),
  read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
 ])
 assert.match(client,/if\(serviceId\)query=query\.eq\('id',serviceId\)\.in\('estado',\['esperando_aprobacion','completado'\]\)/)
 assert.match(client,/else query=query\.eq\('estado','esperando_aprobacion'\)/)
 assert.match(client,/completed=service\.estado==='completado'/)
 assert.match(client,/<ClientEvidenceGallery serviceId=\{service\.id\}\/>/)
 assert.match(client,/rpc\('aprobar_servicio'/)
 assert.match(backend,/v_servicio\.cliente_id<>auth\.uid\(\)/)
 assert.match(backend,/e\.usuario_id=v_servicio\.proveedor_id/)
})

test('client sees provider work evidence on the active assignment and exact service detail in realtime',async()=>{
 const [gallery,postConfirm,detail,rls]=await Promise.all([
  read('src/features/client/order/ClientEvidenceGallery.tsx'),
  read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('supabase/migrations/20260911_service_evidence.sql'),
 ])
 assert.match(postConfirm,/<ClientEvidenceGallery serviceId=\{service\.id\} hideWhenEmpty compact\/>/)
 assert.match(detail,/<ClientEvidenceGallery serviceId=\{service\.id\} hideWhenEmpty\/>/)
 assert.match(gallery,/table:'evidencias_servicio',filter:`servicio_id=eq\.\$\{serviceId\}`/)
 assert.match(gallery,/createSignedUrl\(row\.storage_path,900\)/)
 assert.match(rls,/s\.cliente_id = auth\.uid\(\) or s\.proveedor_id = auth\.uid\(\)/)
})

test('client and provider require cancellation confirmation before mutating an order',async()=>{
 const [postConfirm,detail,history,activeJob,providerData,providerService]=await Promise.all([
  read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/mvp/ServiceHistoryPanel.tsx'),
  read('src/mvp/provider/ProviderActiveJob.tsx'),
  read('src/mvp/provider/providerData.tsx'),
  read('src/mvp/provider/providerService.ts'),
 ])
 assert.match(postConfirm,/window\.confirm\('¿Realmente querés cancelar este pedido\?'\)/)
 assert.match(detail,/window\.confirm\('¿Realmente querés cancelar este pedido\?'\)/)
 assert.match(history,/window\.confirm\('¿Realmente querés cancelar este pedido\?'\)/)
 assert.match(activeJob,/window\.confirm\('¿Realmente querés cancelar este pedido\?'\)/)
 assert.match(activeJob,/window\.prompt\('Contanos brevemente por qué cancelás este pedido/)
 assert.match(providerData,/cancelProviderService\(supabase,serviceId,reason\)/)
 assert.match(providerService,/rpc\('cancelar_servicio_proveedor'/)
})

test('scope changes stay inside the active service and paid deltas are reconciled before closure',async()=>{
 const [panel,guard,checkout]=await Promise.all([
  read('src/mvp/ServiceExpansionPanel.tsx'),
  read('supabase/migrations/20260911222000_service_expansion_payment_guard.sql'),
  read('supabase/migrations/20260911224500_expansion_electronic_checkout.sql'),
 ])
 assert.match(panel,/eq\('servicio_id',current\.id\)/)
 assert.match(guard,/pago_estado='pendiente_ajuste'/)
 assert.match(guard,/Hay un trabajo adicional aprobado con ajuste de pago pendiente/)
 assert.match(checkout,/pago_estado='incluido'/)
})

test('provider and client observe critical service changes through realtime',async()=>{
 const [providerRealtime,clientReview]=await Promise.all([
  read('src/mvp/provider/useProviderRealtime.ts'),
  read('src/features/client/order/ClientCompletionReview.tsx'),
 ])
 assert.match(providerRealtime,/table:'servicios'.*proveedor_id=eq\.\$\{userId\}/)
 assert.match(providerRealtime,/table:'pagos'.*proveedor_id=eq\.\$\{userId\}/)
 assert.match(clientReview,/table:'servicios'.*cliente_id=eq\.\$\{userId\}/)
 assert.match(clientReview,/table:'pagos'/)
})
