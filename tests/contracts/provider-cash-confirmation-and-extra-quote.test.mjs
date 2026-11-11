import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')

test('provider cash selection offers actionable authenticated client-confirmation request',()=>{
 const provider=read('src/mvp/ProviderPostServiceCollection.tsx')
 assert.match(provider,/const requestCashConfirmation=async\(\)=>/)
 assert.match(provider,/\.from\('servicios'\)\.select\('id,estado,proveedor_id'\)/)
 assert.match(provider,/\.eq\('proveedor_id',auth\.user\.id\)/)
 assert.match(provider,/\.from\('mensajes'\)\.insert\(/)
 assert.match(provider,/cash_confirmation_request/)
 assert.match(provider,/onClick=\{\(\)=>void requestCashConfirmation\(\)\}/)
 assert.doesNotMatch(provider,/\.from\('pagos'\)\.update\(/)
})

test('client can finalize cash after actual handover and refresh stale cash status',()=>{
 const client=read('src/features/client/order/ClientCompletionReview.tsx')
 assert.match(client,/const cashPending=cashSelected&&payment\?\.metodo==='efectivo'&&payment\.estado==='pendiente'/)
 assert.match(client,/confirmApprovedCashClientService\(supabase,userId,service\.id\)/)
 assert.match(client,/className="ugo-completion-cash-confirm"/)
 assert.match(client,/className="ugo-completion-cash-refresh"/)
 assert.match(client,/cashSelected&&<button/)
})

test('provider extra total only submits an approval proposal, never a live QR or unilateral charge',()=>{
 const provider=read('src/mvp/ProviderPostServiceCollection.tsx')
 assert.match(provider,/const requestAdditionalQuote=async\(\)=>/)
 assert.match(provider,/post_service_extra_quote/)
 assert.match(provider,/requestedTotal\.replace\(',', '\.'\)|requestedTotal\.replace\(',','\.'\)/)
 assert.match(provider,/labels\.extraNote/)
 assert.doesNotMatch(provider,/\.from\('servicios'\)\.update\(/)
 assert.doesNotMatch(provider,/\/api\/pagos\/crear/)
})

test('real cash settlement and 3 open commissions remain backend-controlled',()=>{
 const migrations=read('supabase/migrations/20260920070000_cash_provider_ugo_debt_ledger.sql')
 const limit=read('supabase/migrations/20260920073500_provider_ugo_debt_order_block.sql')
 assert.match(migrations,/new\.estado <> 'liberado'/)
 assert.match(limit,/count\(\*\) >= 3/)
 assert.match(limit,/d\.estado not in \('pagado','anulado'\)/)
})
