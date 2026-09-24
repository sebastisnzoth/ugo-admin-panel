import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const debt=fs.readFileSync('supabase/migrations/20260920070000_cash_provider_ugo_debt_ledger.sql','utf8')
const pricing=fs.readFileSync('supabase/migrations/20260920071000_lock_tariff_snapshot_end_to_end.sql','utf8')
const freeze=fs.readFileSync('supabase/migrations/20260920075500_freeze_ugo_quote_and_hide_debt_blocked_offers.sql','utf8')
const blocking=fs.readFileSync('supabase/migrations/20260920073500_provider_ugo_debt_order_block.sql','utf8')
const cashUi=fs.readFileSync('src/features/client/payments/ClientPaymentChoice.tsx','utf8')
const completion=fs.readFileSync('src/features/client/order/ClientCompletionReview.tsx','utf8')
const home=fs.readFileSync('src/mvp/provider/ProviderHome.tsx','utf8')
const wallet=fs.readFileSync('supabase/migrations/20260920072000_provider_digital_balance_cash_exclusion.sql','utf8')
const client=fs.readFileSync('src/features/client/request/ClientPostConfirmFlow.tsx','utf8')
const providerData=fs.readFileSync('src/mvp/provider/providerData.tsx','utf8')
const earnings=fs.readFileSync('src/mvp/provider/ProviderEarnings.tsx','utf8')
const receipt=fs.readFileSync('src/mvp/ProviderCompletionReceipt.tsx','utf8')
const admin=fs.readFileSync('src/mvp/AdminFinancePanel.tsx','utf8')
const trace=fs.readFileSync('src/mvp/AdminServiceTracePanel.tsx','utf8')

test('cash collection creates a separate provider debt ledger',()=>{
 assert.match(debt,/create table if not exists public\.deudas_ugo_proveedor/i)
 assert.match(debt,/saldo_pendiente numeric.*generated always/i)
 assert.match(debt,/trg_sync_cash_commission_debt/)
 assert.match(debt,/new\.metodo <> 'efectivo'/)
 assert.match(debt,/informar_pago_deuda_ugo/)
 assert.match(debt,/admin_confirmar_deuda_ugo_pagada/)
 assert.match(debt,/private\.is_admin\(auth\.uid\(\)\)/)
})

test('cash is not counted as withdrawable provider wallet balance',()=>{
 assert.match(providerData,/p\.estado==='liberado'&&p\.metodo!=='efectivo'/)
 assert.match(providerData,/cashReceived=payments\.filter\(p=>p\.estado==='liberado'&&p\.metodo==='efectivo'\)/)
 assert.match(providerData,/ugoDebt=debts\.filter/)
 assert.match(earnings,/COBRADO EN EFECTIVO/)
 assert.match(earnings,/DEBÉS A UGO/)
 assert.match(receipt,/EFECTIVO REGISTRADO/)
 assert.match(receipt,/Ese dinero ya lo recibiste directamente/)
})

test('Admin can reconcile cash commission debts with an external reference',()=>{
 assert.match(admin,/from\('deudas_ugo_proveedor'\)/)
 assert.match(admin,/admin_confirmar_deuda_ugo_pagada/)
 assert.match(admin,/DEUDA UGO EFECTIVO/)
 assert.match(admin,/EFECTIVO COBRADO/)
 assert.match(trace,/from\('deudas_ugo_proveedor'\)/)
 assert.match(trace,/Deuda UGO/)
})

test('quoted tariff is the canonical service amount end to end',()=>{
 assert.match(pricing,/metadata->'tariff_quote'->>'precio_referencia'/)
 assert.match(pricing,/old\.proveedor_id is null and new\.proveedor_id is not null/)
 assert.match(pricing,/new\.tarifa := v_total/)
 assert.match(pricing,/new\.comision_ugo := round\(v_total\*0\.15,2\)/)
 assert.match(client,/serviceAmount=requested>0\?requested:quoted>0\?quoted:null/)
 assert.match(client,/comision_ugo:commission/)
 assert.match(providerData,/estimatedValue:Number\(serviceData\?\.tarifa\|\|offer\.tarifa_ofrecida\|\|0\)/)
})

test('provider withdrawal balance excludes cash at the database boundary',()=>{
 assert.match(wallet,/create or replace function public\.saldo_proveedor\(\)/i)
 assert.match(wallet,/coalesce\(p\.metodo,''\)<>'efectivo'/)
 assert.match(wallet,/create or replace function public\.solicitar_retiro\(p_monto numeric\)/i)
 assert.match(wallet,/pg_advisory_xact_lock/)
 assert.match(wallet,/Saldo insuficiente/)
})


test('three unresolved cash commissions pause new provider work',()=>{
 assert.match(blocking,/count\(\*\) >= 3/)
 assert.match(blocking,/online=false,disponible=false/)
 assert.match(blocking,/estado='expirada'/)
 assert.match(freeze,/not private\.proveedor_bloqueado_por_deuda_ugo\(auth\.uid\(\)\)/)
})

test('quoted UGO price cannot be silently replaced at assignment',()=>{
 assert.match(freeze,/freeze_ugo_quoted_tariff/)
 assert.match(freeze,/new\.tarifa := v_frozen/)
 assert.match(freeze,/new\.comision_ugo := round\(v_frozen \* 0\.15,2\)/)
 assert.match(freeze,/new\.ganancia_proveedor := round\(v_frozen - new\.comision_ugo,2\)/)
})

test('cash responsibility is visible and client-confirmed',()=>{
 assert.match(cashUi,/seleccionar_pago_efectivo/)
 assert.match(cashUi,/UGO registra la confirmación/)
 assert.match(completion,/YA PAGUÉ/)
 assert.match(completion,/Después de entregar el efectivo/)
 assert.equal(fs.existsSync('src/mvp/ClientCashPaymentOption.tsx'),false)
 assert.equal(fs.existsSync('src/mvp/ClientPixPaymentPanel.tsx'),false)
 assert.match(home,/Efectivo \{money\(d\.cashReceived\)\}/)
 assert.match(home,/Debés UGO \{money\(d\.ugoDebt\)\}/)
})
