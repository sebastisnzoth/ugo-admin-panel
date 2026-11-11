import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const read=(p)=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')

test('provider screen never advertises an unavailable real Pix QR',()=>{
 const collection=read('src/mvp/ProviderPostServiceCollection.tsx')
 const job=read('src/mvp/provider/ProviderActiveJob.tsx')
 assert.match(collection,/onClick=\{\(\)=>setPixDetailsOpen\(true\)\}/)
 assert.match(collection,/Pix selecionado, mas não há QR Asaas/)
 assert.match(collection,/cashDebt/)
 assert.match(job,/openDebtCount=\{d\.pendingDebtCount\}/)
 assert.match(job,/onOpenEarnings=\{flow\.actions\.openEarnings\}/)
 assert.match(collection,/Math\.min\(Math\.max\(0,openDebtCount\),3\)\}\/3/)
})

test('cash only counts against the three-service cap after client confirms payment',()=>{
 const trigger=read('supabase/migrations/20260920070000_cash_provider_ugo_debt_ledger.sql')
 const limit=read('supabase/migrations/20260920073500_provider_ugo_debt_order_block.sql')
 assert.match(trigger,/new\.estado <> 'liberado'/)
 assert.match(limit,/count\(\*\) >= 3/)
 assert.match(limit,/d\.ambiente='real'/)
 assert.match(limit,/d\.estado not in \('pagado','anulado'\)/)
})

test('UGO debt Pix is a separate authenticated endpoint, not the customer Pix charge',()=>{
 const provider=read('src/features/provider/services/providerEarningsService.ts')
 const api=read('api/test.ts')
 assert.match(provider,/createProviderDebtPix/)
 assert.match(provider,/ugo_debt=1/)
 assert.match(api,/UGO_PIX_KEY/)
 assert.match(api,/deuda\.proveedor_id|eq\('proveedor_id',user\.id\)/)
})
