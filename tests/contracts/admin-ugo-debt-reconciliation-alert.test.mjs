import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('admin metrics count informed UGO commission debts waiting for reconciliation',async()=>{
 const phase=await read('src/mvp/AdminPhase2.tsx')
 assert.match(phase,/pendingDebtReconciliations/)
 assert.match(phase,/from\('deudas_ugo_proveedor'\).*estado','informado'/s)
 assert.match(phase,/saldo_pendiente',0/)
 assert.match(phase,/pendingPix\+metrics\.pendingDebtReconciliations/)
})

test('admin home exposes a direct decision path to debt reconciliation',async()=>{
 const home=await read('src/mvp/AdminHomeStitch.tsx')
 assert.match(home,/onOpenDebtReconciliation/)
 assert.match(home,/Comisiones informadas/)
 assert.match(home,/Pagos de proveedores esperando conciliación/)
 assert.match(home,/pendingProviders \+ metrics\.pendingPix \+ metrics\.pendingDebtReconciliations/)
})
