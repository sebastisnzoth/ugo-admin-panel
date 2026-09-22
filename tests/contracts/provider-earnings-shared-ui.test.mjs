import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider earnings consumes shared UI while preserving debt and payout behavior',async()=>{
 const s=await read('src/mvp/provider/ProviderEarnings.tsx')
 assert.match(s,/from'\.\.\/\.\.\/shared\/ui'/)
 for(const token of ['SectionHeader','StatusPill','Textarea','Card','Button'])assert.match(s,new RegExp(token))
 assert.match(s,/rpc\('informar_pago_deuda_ugo'/)
 assert.match(s,/\/api\/test\?ugo_debt=1/)
 assert.match(s,/Authorization:\x60Bearer \$\{d\.accessToken\}\x60/)
 assert.match(s,/ProviderPayoutPanel accessToken=\{d\.accessToken\}/)
 assert.match(s,/pendingDebtCount/)
 assert.match(s,/PAGAR UGO · PIX/)
 assert.match(s,/COBRADO EN EFECTIVO/)
 assert.match(s,/DEBÉS A UGO/)
})
