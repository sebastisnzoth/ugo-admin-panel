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

test('provider cannot leave assigned without a valid payment path',async()=>{
 const [providerData,backend]=await Promise.all([
  read('src/mvp/provider/providerData.tsx'),
  read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
 ])
 assert.match(providerData,/service\.estado==='asignado'&&!funded&&!cashSelected/)
 assert.match(backend,/p\.estado='retenido'/)
 assert.match(backend,/p\.metodo='efectivo'[\s\S]*p\.modelo_pago='presencial'/)
})

test('provider review request requires final evidence and cash receipt when cash is selected',async()=>{
 const [providerData,activeJob,backend]=await Promise.all([
  read('src/mvp/provider/providerData.tsx'),
  read('src/mvp/provider/ProviderActiveJob.tsx'),
  read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
 ])
 assert.match(activeJob,/state:'esperando_aprobacion'[\s\S]*disabled:!evidence\.final/)
 assert.match(providerData,/state==='esperando_aprobacion'&&cashSelected&&!cashConfirmed/)
 assert.match(backend,/v_servicio\.estado='en_progreso'[\s\S]*e\.tipo='despues'/)
})

test('client approval is scoped to its service and backend verifies ownership plus final provider evidence',async()=>{
 const [client,backend]=await Promise.all([
  read('src/mvp/ClientCompletionReview.tsx'),
  read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
 ])
 assert.match(client,/\.eq\('cliente_id',uid\)\.eq\('estado','esperando_aprobacion'\)/)
 assert.match(client,/rpc\('aprobar_servicio'/)
 assert.match(backend,/v_servicio\.cliente_id<>auth\.uid\(\)/)
 assert.match(backend,/e\.usuario_id=v_servicio\.proveedor_id/)
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
  read('src/mvp/ClientCompletionReview.tsx'),
 ])
 assert.match(providerRealtime,/table:'servicios'.*proveedor_id=eq\.\$\{userId\}/)
 assert.match(providerRealtime,/table:'pagos'.*proveedor_id=eq\.\$\{userId\}/)
 assert.match(clientReview,/table:'servicios'.*cliente_id=eq\.\$\{userId\}/)
 assert.match(clientReview,/table:'pagos'/)
})
