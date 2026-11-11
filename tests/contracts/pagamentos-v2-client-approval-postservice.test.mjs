import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = path => readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const review=source('src/features/client/order/ClientCompletionReview.tsx')
const actions=source('src/features/client/services/clientActionService.ts')
const sql=source('docs/sql/ugo_pix_after_service_test_approval_review_only.sql')

test('Pix review only authorizes approval when final evidence is present and work not already approved',()=>{
 assert.match(review,/const canApprove=!completed&&service.estado==='esperando_aprobacion'&&hasFinalEvidence&&/)
 assert.match(review,/deferredPix\?!workApproved:/)
 assert.match(review,/deferredPixPreview:deferredPix/)
 assert.match(review,/deferredPix\|\|isCash\?t\('clientReview.confirmWork'\)/)
})

test('deferred Pix calls a separate gated TEST-only approval RPC; production cash/electronic approval remains canonical',()=>{
 assert.match(actions,/options:\{deferredPixPreview\?:boolean\}=\{\}/)
 assert.match(actions,/options.deferredPixPreview===true\?'aprobar_trabajo_pix_diferido_test':'aprobar_servicio'/)
 assert.match(actions,/supabase.rpc\(rpc,\{p_servicio_id:row.id\}\)/)
 assert.match(actions,/const persisted=await readOwnedClosureService/)
})

test('TEST approval is owner-only, serializes service and preserves all payment boundaries',()=>{
 assert.match(sql,/REVIEW ONLY \/ TEST ONLY/)
 assert.match(sql,/if auth.uid\(\) is null/)
 assert.match(sql,/v_servicio.cliente_id is distinct from auth.uid\(\)/)
 assert.match(sql,/for update/)
 assert.match(sql,/v_servicio.estado <> 'esperando_aprobacion'/)
 assert.match(sql,/ugo_pix_after_service_test_enabled/)
 assert.match(sql,/v_servicio.ambiente <> 'demo'/)
 assert.match(sql,/private.is_demo_service\(p_servicio_id\)/)
 assert.match(sql,/private.is_demo_account\(auth.uid\(\),'cliente'\)/)
 assert.match(sql,/private.is_demo_account\(v_servicio.proveedor_id,'proveedor'\)/)
 assert.match(sql,/v_method <> 'pix'/)
 assert.match(sql,/private.ugo_pix_after_service_allowed_services/)
 assert.match(sql,/a.expires_at>now\(\)/)
 assert.match(sql,/e.tipo='despues'/)
 assert.match(sql,/p.servicio_id=p_servicio_id/)
 assert.match(sql,/nullif\(v_servicio.metadata->>'trabajo_aprobado_at'/)
 assert.match(sql,/return v_servicio/)
 assert.match(sql,/revoke all on function public.aprobar_trabajo_pix_diferido_test/)
 assert.doesNotMatch(sql,/update public.pagos|insert into public.pagos|delete from public.pagos|set estado='completado'|set estado='liberado'/)
})
