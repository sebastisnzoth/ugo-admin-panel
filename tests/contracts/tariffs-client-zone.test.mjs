import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260920062000_operational_tariffs.sql','utf8')
const safeQuote=fs.readFileSync('supabase/migrations/20260920063000_service_zone_safe_quote.sql','utf8')
const admin=fs.readFileSync('src/mvp/AdminTariffsPanel.tsx','utf8')
const location=fs.readFileSync('src/features/client/request/ClientLocationScreen.tsx','utf8')
const summary=fs.readFileSync('src/mvp/client/ClientSummaryScreen.tsx','utf8')
const post=fs.readFileSync('src/features/client/request/ClientPostConfirmFlow.tsx','utf8')

test('pricing creates canonical tariff storage with Admin-only reads',()=>{
 assert.match(migration,/create table if not exists public\.tarifas/i)
 assert.match(migration,/alter table public\.tarifas enable row level security/i)
 assert.match(migration,/private\.is_admin\(auth\.uid\(\)\)/)
 assert.match(migration,/revoke all on table public\.tarifas from anon/i)
 assert.match(migration,/admin_upsert_tarifa/)
 assert.match(migration,/admin_set_tarifa_activa/)
})

test('client quotes never fall through to a tariff from another zone',()=>{
 assert.match(safeQuote,/cotizar_tarifa_servicio/)
 assert.match(safeQuote,/lower\(btrim\(t\.zona\)\) in \('general','global','todas'\)/)
 assert.match(safeQuote,/lower\(coalesce\(p_direccion,''\)\) like/)
 assert.match(safeQuote,/alter table public\.servicios add column if not exists zona text/i)
})

test('Admin finance can create edit activate and deactivate tariffs',()=>{
 assert.match(admin,/Nueva tarifa/)
 assert.match(admin,/Crear tarifa/)
 assert.match(admin,/Editar/)
 assert.match(admin,/Desactivar/)
 assert.match(admin,/useTarifas\(\)/)
 assert.match(admin,/useCategorias\(\)/)
})

test('client location requests and displays a zone tariff quote',()=>{
 assert.match(location,/cotizar_tarifa_servicio/)
 assert.match(location,/TARIFA UGO/)
 assert.match(location,/Sin tarifa UGO para esta zona/)
 assert.match(location,/tariffQuote/)
 assert.match(summary,/Tarifa UGO/)
 assert.match(post,/pricing_zone/)
 assert.match(post,/tariff_quote/)
 assert.match(post,/zona:draft\.zone/)
})
