import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('three unresolved UGO commission debts block provider from new work',async()=>{
 const sql=await read('supabase/migrations/20260920073500_provider_ugo_debt_order_block.sql')
 assert.match(sql,/count\(\*\)\s*>=\s*3/)
 assert.match(sql,/ambiente='real'/)
 assert.match(sql,/estado not in \('pagado','anulado'\)/)
 assert.match(sql,/set online=false,disponible=false/)
 assert.match(sql,/update public\.ofertas_servicio[\s\S]*estado='expirada'/)
 assert.match(sql,/guard_provider_online_when_ugo_debt_blocked/)
 assert.match(sql,/guard_provider_assignment_when_ugo_debt_blocked/)
 assert.match(sql,/Pagá a UGO antes de aceptar otro pedido/)
})

test('provider UI exposes the debt block and a real pay UGO action',async()=>{
 const[earnings,data,opportunities,home,endpoint]=await Promise.all([
  read('src/mvp/provider/ProviderEarnings.tsx'),
  read('src/mvp/provider/providerData.tsx'),
  read('src/mvp/provider/ProviderOpportunities.tsx'),
  read('src/mvp/provider/ProviderHome.tsx'),
  read('api/test.ts'),
 ])
 assert.match(data,/pendingDebtCount>=3/)
 assert.match(data,/debtBlocked/)
 assert.match(earnings,/PAGAR UGO · PIX/)
 assert.match(earnings,/\/api\/test\?ugo_debt=1/)
 assert.match(opportunities,/Nuevos pedidos pausados/)
 assert.match(opportunities,/PAGAR UGO/)
 assert.match(home,/Pagá a UGO para volver al radar/)
 assert.match(endpoint,/UGO_PIX_KEY/)
 assert.match(endpoint,/eq\('proveedor_id',user\.id\)/)
 assert.match(endpoint,/Generar|pixCopiaCola/)
})


test('admin cannot knowingly select a debt-blocked provider',async()=>{
 const[hook,admin]=await Promise.all([
  read('src/hooks/useAdminActiveServices.ts'),
  read('src/mvp/AdminServicesPro.tsx'),
 ])
 assert.match(hook,/pendingDebtCount>=3/)
 assert.match(hook,/debtBlocked:pendingDebtCount>=3/)
 assert.match(admin,/disabled=\{p\.debtBlocked\}/)
 assert.match(admin,/BLOQUEADO UGO/)
 assert.match(admin,/no puede recibir otro pedido/)
})
