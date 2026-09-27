import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider acceptance boundary rechecks 3-debt UGO block',async()=>{
 const sql=await read('supabase/migrations/20260927154500_provider_debt_acceptance_gate.sql')
 assert.match(sql,/proveedor_bloqueado_por_deuda_ugo\(v_uid\)/)
 assert.match(sql,/3 servicios con comisión UGO pendiente/)
 assert.match(sql,/aceptar_oferta_impl\(uuid\)/)
})

test('debt acceptance guard is inserted only for new pending offers, preserving accepted idempotency',async()=>{
 const sql=await read('supabase/migrations/20260927154500_provider_debt_acceptance_gate.sql')
 const pending=sql.indexOf("if v_oferta.estado <> ''pendiente'' then return null")
 const guard=sql.indexOf('proveedor_bloqueado_por_deuda_ugo(v_uid)')
 assert.ok(pending>=0&&guard>pending)
})
