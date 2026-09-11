import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('arrival UI and backend share the 200m contract',async()=>{
 const [tracker,backend]=await Promise.all([
  read('src/mvp/ProviderLocationTracker.tsx'),
  read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql'),
 ])
 assert.match(tracker,/ARRIVAL_RADIUS_M=200/)
 assert.match(backend,/v_dist_m > 200/)
})

test('operational evidence cannot be preloaded outside its real lifecycle state',async()=>{
 const sql=await read('supabase/migrations/20260911215500_service_evidence_state_guard.sql')
 assert.match(sql,/new\.tipo = 'antes' and v_servicio\.estado <> 'llegado'/)
 assert.match(sql,/new\.tipo = 'durante' and v_servicio\.estado <> 'en_progreso'/)
 assert.match(sql,/new\.tipo = 'despues' and v_servicio\.estado not in \('en_progreso','esperando_aprobacion'\)/)
 assert.match(sql,/new\.usuario_id is distinct from v_servicio\.proveedor_id/)
})

test('provider cannot start without initial evidence or request review without final evidence',async()=>{
 const sql=await read('supabase/migrations/20260911_cash_evidence_backend_hardening.sql')
 assert.match(sql,/v_servicio\.estado='llegado'[\s\S]*e\.tipo='antes'/)
 assert.match(sql,/v_servicio\.estado='en_progreso'[\s\S]*e\.tipo='despues'/)
})

test('cash remains presencial and is never used as electronic custody',async()=>{
 const sql=await read('supabase/migrations/20260911_cash_payment_first_class.sql')
 assert.match(sql,/'efectivo','efectivo','presencial'/)
 assert.match(sql,/modelo_pago = 'presencial'/)
})

test('active electronic payments require a separately funded expansion delta',async()=>{
 const guard=await read('supabase/migrations/20260911222000_service_expansion_payment_guard.sql')
 assert.match(guard,/ajuste de monto adicional debe cobrarse antes de aprobar la ampliación/)
 assert.match(guard,/a\.estado='aprobada'[\s\S]*a\.pago_estado='pendiente_ajuste'/)

 const checkout=await read('api/pagos/ajuste-ampliacion.ts')
 assert.match(checkout,/external_reference:`exp:\$\{expansion\.id\}`/)
 assert.match(checkout,/X-Idempotency-Key.*ugo-exp-/)
 assert.match(checkout,/pago_estado:'pendiente_ajuste'/)

 const migration=await read('supabase/migrations/20260911224500_expansion_electronic_checkout.sql')
 assert.match(migration,/confirmar_pago_ampliacion/)
 assert.match(migration,/abs\(coalesce\(p_monto,0\)-v_row\.monto_extra\) >= 0\.01/)
 assert.match(migration,/ajuste_estado='retenido'/)
 assert.match(migration,/pago_estado='incluido'/)

 const webhook=await read('api/pagos/webhook.ts')
 assert.match(webhook,/metadata\?\.ampliacion_id/)
 assert.match(webhook,/sb\.rpc\('confirmar_pago_ampliacion'/)

 const ui=await read('src/mvp/ServiceExpansionPanel.tsx')
 assert.match(ui,/\/api\/pagos\/ajuste-ampliacion/)
 assert.match(ui,/Pagar y aprobar/)
 assert.match(ui,/Continuar pago/)
})

test('completion review is scoped to the authenticated client and assigned-provider final evidence',async()=>{
 const ui=await read('src/mvp/ClientCompletionReview.tsx')
 assert.match(ui,/\.eq\('cliente_id',uid\)\.eq\('estado','esperando_aprobacion'\)/)
 assert.match(ui,/\.eq\('tipo','despues'\)\.eq\('usuario_id',next\.proveedor_id\)/)
})
