import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const client=file('src/features/client/payments/ClientPaymentChoice.tsx')
const provider=file('src/mvp/provider/providerData.tsx')
const flags=file('src/lib/featureFlags.ts')
const sql=file('supabase/migrations/20260930190000_variable_price_lifecycle_payment_gate.sql')
test('Pix pay-after-service is locked out of production and defaults disabled',()=>{
 assert.match(flags,/isPixPayAfterServicePreviewEnabled/)
 assert.match(flags,/env.VITE_VERCEL_ENV === 'preview'/)
 assert.match(flags,/VITE_FLAG_PIX_PAY_AFTER_SERVICE_PREVIEW/)
})
test('client Preview Pix choice saves the preference but does not issue the charge',()=>{
 assert.match(client,/const preference=await persistPreference\('pix'\)/)
 assert.match(client,/if\(isPixPayAfterServicePreviewEnabled\(\)&&deferredPixPilotEligible\(service/)
 const choice=client.split('async function choosePix(){')[1].split('async function copyPix(){')[0]
 const preference=choice.indexOf("await persistPreference('pix')")
 const guard=choice.indexOf('if(isPixPayAfterServicePreviewEnabled()&&deferredPixPilotEligible(service')
 const charge=choice.indexOf("fetch('/api/pagos/crear'")
 assert.ok(preference>=0&&guard>preference&&charge>guard)
 assert.match(choice.slice(guard,charge),/await load\(\);return/)
})
test('existing production Pix flow remains unchanged until coordinated backend upgrade',()=>{
 assert.match(client,/fetch\('\/api\/pagos\/crear'/)
 assert.match(provider,/effectivePaymentMethod==='pix'&&!funded&&!deferredPixAuthorized/)
 assert.match(sql,/v_has_ready_payment/)
 assert.match(sql,/La forma de pago todavía no está confirmada para empezar el trabajo/)
})

test('deferred Pix is restricted to a demo service with an explicit server-side marker',()=>{
 const policy=file('src/lib/payments/deferredPixPilot.ts')
 assert.match(policy,/service\.ambiente !== 'demo'/)
 assert.match(policy,/metadata\.pix_after_service_authorized === true/)
 assert.match(policy,/metadata\.payment_timing === 'after_service'/)
 assert.match(policy,/requested_payment_method/)
 assert.match(client,/deferredPixPilotEligible/)
 assert.match(provider,/deferredPixPilotEligible/)
 assert.match(provider,/const paymentPreferenceSelected=Boolean\(deferredPixAuthorized/)
})

test('TEST-only SQL proposal requires explicit operator config and preserves photos, GPS, price and state machine',()=>{
 const proposal=file('docs/sql/ugo_pix_after_service_test_policy_review_only.sql')
 assert.match(proposal,/REVIEW-ONLY SQL PROPOSAL/)
 assert.match(proposal,/ugo_pix_after_service_test_enabled/)
 assert.match(proposal,/v_demo/)
 assert.match(proposal,/v_servicio\.ambiente='demo'/)
 assert.match(proposal,/pix_after_service_authorized/)
 assert.match(proposal,/payment_timing'='after_service'/)
 assert.match(proposal,/and not v_deferred_pix/)
 assert.match(proposal,/extensions\.st_distance/)
 assert.match(proposal,/e\.tipo='antes'/)
 assert.match(proposal,/e\.tipo='despues'/)
 assert.match(proposal,/v_servicio\.programado_para/)
 assert.doesNotMatch(proposal,/insert into public\.pagos|delete from public\.pagos/)
})

test('client post-service Pix review waits for Asaas without claiming payment',()=>{
 const review=file('src/features/client/order/ClientCompletionReview.tsx')
 assert.match(review,/deferredPixPilotEligible\(service\)/)
 assert.match(review,/isPixPayAfterServicePreviewEnabled/)
 assert.match(review,/const deferredPixWaiting=deferredPix&&!completed&&!electronicReady/)
 assert.match(review,/role="status">\{deferredPixHelp\}/)
 assert.match(review,/!deferredPixWaiting&&<div className="ugo-completion-warning"/)
 assert.match(review,/const canApprove=.*electronicReady/)
 assert.doesNotMatch(review,/if\(deferredPixWaiting\).*approvePendingClientService/)
})

test('private TEST allowlist cannot be populated by clients or ordinary authenticated users',()=>{
 const allowlist=file('docs/sql/ugo_pix_after_service_test_allowlist.sql')
 const gate=file('docs/sql/ugo_pix_after_service_test_policy_review_only.sql')
 assert.match(allowlist,/create table if not exists private\.ugo_pix_after_service_allowed_services/)
 assert.match(allowlist,/enable row level security/)
 assert.match(allowlist,/revoke all on private\.ugo_pix_after_service_allowed_services from public,anon,authenticated/)
 assert.match(gate,/exists \([\s\S]*private\.ugo_pix_after_service_allowed_services a/)
 assert.match(gate,/a\.service_id=v_servicio\.id and a\.expires_at>now\(\)/)
 assert.match(gate,/ugo_pix_after_service_test_enabled/)
 assert.doesNotMatch(allowlist,/insert into private\.ugo_pix_after_service_allowed_services/)
})

test('first Pix selection uses prospective Pix method after server RPC, not stale metadata',()=>{
 const helper=file('src/lib/payments/deferredPixPilot.ts')
 const choice=client.split('async function choosePix(){')[1].split('async function copyPix(){')[0]
 assert.match(helper,/methodOverride\?: 'pix'/)
 assert.match(helper,/String\(methodOverride \|\| metadata\.requested_payment_method/)
 assert.match(choice,/deferredPixPilotEligible\(service as ServiceWithCurrency & \{ambiente\?:string\|null\},'pix'\)/)
 assert.ok(choice.indexOf("await persistPreference('pix')")<choice.indexOf("},'pix')"))
})
