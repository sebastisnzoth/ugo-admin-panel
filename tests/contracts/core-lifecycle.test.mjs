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

test('extra-cost scope cannot be silently approved over an active electronic payment',async()=>{
 const sql=await read('supabase/migrations/20260911222000_service_expansion_payment_guard.sql')
 assert.match(sql,/pago electrónico activo\. El ajuste de monto adicional debe cobrarse antes de aprobar la ampliación/)
 assert.match(sql,/a\.estado='aprobada'[\s\S]*a\.pago_estado='pendiente_ajuste'/)
 const ui=await read('src/mvp/ServiceExpansionPanel.tsx')
 assert.match(ui,/Falta cobrar ajuste/)
 assert.match(ui,/disabled=\{busy\|\|adjustmentBlocked\}/)
})

test('completion review is scoped to the authenticated client and assigned-provider final evidence',async()=>{
 const ui=await read('src/mvp/ClientCompletionReview.tsx')
 assert.match(ui,/\.eq\('cliente_id',uid\)\.eq\('estado','esperando_aprobacion'\)/)
 assert.match(ui,/\.eq\('tipo','despues'\)\.eq\('usuario_id',next\.proveedor_id\)/)
})
