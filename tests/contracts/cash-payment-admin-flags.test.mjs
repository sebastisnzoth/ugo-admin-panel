import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260916092000_cash_payment_admin_flags.sql','utf8')
const ui=fs.readFileSync('src/mvp/AdminPaymentMethods.tsx','utf8')

test('cash payment flags are seeded with explicit operational defaults',()=>{
 for(const key of ['pago_efectivo_activo','pago_efectivo_br_activo','pago_efectivo_ar_activo']) assert.match(migration,new RegExp(key))
 assert.match(migration,/on conflict \(clave\) do nothing/)
})

test('cash selection enforces global and market flags before mutating payment',()=>{
 const globalCheck=migration.indexOf("clave='pago_efectivo_activo'")
 const brCheck=migration.indexOf("clave='pago_efectivo_br_activo'")
 const arCheck=migration.indexOf("clave='pago_efectivo_ar_activo'")
 const paymentMutation=migration.indexOf('select * into v_pago from public.pagos')
 assert.ok(globalCheck>0&&brCheck>globalCheck&&arCheck>globalCheck)
 assert.ok(paymentMutation>brCheck&&paymentMutation>arCheck)
 assert.match(migration,/El pago en efectivo está deshabilitado por UGO/)
 assert.match(migration,/El pago en efectivo está deshabilitado para Brasil/)
 assert.match(migration,/El pago en efectivo está deshabilitado para Argentina/)
})

test('Admin cash controls require confirmation before persisting',()=>{
 assert.match(ui,/window\.confirm/)
 assert.match(ui,/update\(key,String\(value\)\)/)
})
