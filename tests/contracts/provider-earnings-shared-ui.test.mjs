import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider earnings consumes shared UI while preserving debt and payout behavior',async()=>{const[s,service]=await Promise.all([read('src/mvp/provider/ProviderEarnings.tsx'),read('src/features/provider/services/providerEarningsService.ts')]);assert.match(s,/from'\.\.\/\.\.\/shared\/ui'/);for(const token of ['SectionHeader','StatusPill','Textarea','Card','Button'])assert.match(s,new RegExp(token));assert.match(service,/rpc\('informar_pago_deuda_ugo'/);assert.match(service,/\/api\/test\?ugo_debt=1/);assert.match(service,/Authorization:\`Bearer \$\{accessToken\}\`/);assert.match(s,/ProviderPayoutPanel accessToken=\{d\.accessToken\}/);assert.match(s,/pendingDebtCount/);assert.match(s,/PAGAR UGO · PIX/);assert.match(s,/COBRADO EN EFECTIVO/);assert.match(s,/DEBÉS A UGO/)})
