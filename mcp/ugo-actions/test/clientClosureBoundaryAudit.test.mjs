import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../../${path}`,import.meta.url),'utf8')

const [ui,migration,multiJobFlow,readme]=await Promise.all([
 read('src/features/client/order/ClientCompletionReview.tsx'),
 read('supabase/migrations/20260920050000_fix_client_cash_close_sensitive_counter.sql'),
 read('supabase/migrations/20260918_provider_multi_jobs_cash_close_flow.sql'),
 read('mcp/ugo-actions/README.md'),
])

const approvalStart=migration.indexOf('create or replace function private.aprobar_servicio_impl')
const cashCloseStart=migration.indexOf('create or replace function public.confirmar_pago_efectivo_cliente')
assert.ok(approvalStart>=0&&cashCloseStart>approvalStart)
const approval=migration.slice(approvalStart,cashCloseStart)

const cashApprovalStart=approval.indexOf('if v_cash then')
const electronicApprovalStart=approval.indexOf("if v_pago.estado<>'retenido'")
assert.ok(cashApprovalStart>=0&&electronicApprovalStart>cashApprovalStart)
const cashApproval=approval.slice(cashApprovalStart,electronicApprovalStart)
const electronicApproval=approval.slice(electronicApprovalStart)

const cashClose=migration.slice(cashCloseStart)

test('client closure UI exposes approval and cash-paid as separate exact-service RPCs',()=>{
 assert.match(ui,/rpc\('aprobar_servicio',\{p_servicio_id:id\}\)/)
 assert.match(ui,/rpc\('confirmar_pago_efectivo_cliente',\{p_servicio_id:id\}\)/)
 assert.match(ui,/\.eq\('id',serviceId\)\.in\('estado',\['esperando_aprobacion','completado'\]\)/)
 assert.match(ui,/\.eq\('cliente_id',uid\)/)
})

test('approval is client-owned and requires waiting state plus real final provider evidence',()=>{
 assert.match(approval,/v_servicio\.cliente_id<>auth\.uid\(\)/)
 assert.match(approval,/v_servicio\.estado<>'esperando_aprobacion'/)
 assert.match(approval,/e\.servicio_id=p_servicio_id/)
 assert.match(approval,/e\.tipo='despues'/)
 assert.match(approval,/e\.usuario_id=v_servicio\.proveedor_id/)
 assert.match(approval,/storage_path/)
})

test('electronic approval completes service and releases only a protected payment',()=>{
 assert.match(electronicApproval,/v_pago\.estado<>'retenido'/)
 assert.match(electronicApproval,/mp_payment_id/)
 assert.match(electronicApproval,/pix_e2e_id/)
 assert.match(electronicApproval,/pago_externo_id/)
 assert.match(electronicApproval,/set estado='completado'/)
 assert.match(electronicApproval,/update public\.pagos[\s\S]*set estado='liberado'/)
})

test('cash approval records work approval but intentionally does not complete the service',()=>{
 assert.match(cashApproval,/v_pago\.estado not in \('pendiente','liberado'\)/)
 assert.match(cashApproval,/trabajo_aprobado_at/)
 assert.match(cashApproval,/return v_servicio/)
 assert.doesNotMatch(cashApproval,/set estado='completado'/)
})

test('cash YA PAGUE is the second client-owned boundary and closes idempotently',()=>{
 assert.match(cashClose,/v_servicio\.cliente_id<>auth\.uid\(\)/)
 assert.match(cashClose,/v_servicio\.estado='completado' and v_pago\.estado='liberado'/)
 assert.match(cashClose,/v_servicio\.estado<>'esperando_aprobacion'/)
 assert.match(cashClose,/trabajo_aprobado_at/)
 assert.match(cashClose,/set estado='liberado'/)
 assert.match(cashClose,/set estado='completado'/)
 assert.match(cashClose,/cliente_pago_efectivo_at/)
})

test('latest client-owned closure hardening never mutates provider protected user counters',()=>{
 assert.doesNotMatch(migration,/update public\.usuarios/)
 assert.doesNotMatch(migration,/set servicios_completados/)
})

test('multi-job cash ordering explicitly defers cash confirmation until after client approval',()=>{
 const guardStart=multiJobFlow.indexOf('create or replace function private.guard_cash_before_approval()')
 const nextStart=multiJobFlow.indexOf('create or replace function private.aprobar_servicio_impl',guardStart)
 assert.ok(guardStart>=0&&nextStart>guardStart)
 const guard=multiJobFlow.slice(guardStart,nextStart)
 assert.match(guard,/El efectivo ya no se confirma antes de enviar el trabajo al cliente/)
 assert.match(guard,/return new/)
})

test('MCP plan keeps approval and cash confirmation as separate future mutation boundaries',()=>{
 assert.match(readme,/15\. client work approval — boundary audited; no MCP mutation implemented yet/)
 assert.match(readme,/16\. cash-payment confirmation — separate boundary after cash work approval; no MCP mutation implemented yet/)
})
