import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260920043000_repair_admin_map_and_scout.sql','utf8')
const map=fs.readFileSync('src/components/MapaOperativo.tsx','utf8')
const scout=fs.readFileSync('src/components/ScoutSection.tsx','utf8')

test('admin map compatibility views exist and stay admin-scoped',()=>{
 assert.match(migration,/create or replace view public\.mapa_operativo_usuarios/i)
 assert.match(migration,/create or replace view public\.mapa_operativo_servicios/i)
 assert.match(migration,/create or replace view public\.vista_todos_proveedores/i)
 assert.match(migration,/private\.is_admin\(auth\.uid\(\)\)/)
 assert.match(migration,/revoke all on public\.mapa_operativo_usuarios,public\.mapa_operativo_servicios,public\.vista_todos_proveedores from anon/i)
 assert.match(map,/from\('mapa_operativo_usuarios'\)/)
 assert.match(map,/from\('mapa_operativo_servicios'\)/)
})

test('Scout persists prospect data behind admin RLS',()=>{
 assert.match(migration,/create table if not exists public\.prospectos_scouts/i)
 assert.match(migration,/alter table public\.prospectos_scouts enable row level security/i)
 assert.match(migration,/prospectos_scouts_admin_insert/i)
 assert.match(migration,/private\.is_admin\(auth\.uid\(\)\)/)
 assert.match(scout,/from\('prospectos_scouts'\)/)
 assert.match(scout,/upsert\(row,\{onConflict:'external_id'\}\)/)
})

test('Scout uses the current Supabase session for protected search',()=>{
 assert.match(scout,/supabase\.auth\.getSession\(\)/)
 assert.match(scout,/Authorization:`Bearer \$\{token\}`/)
 assert.match(scout,/fetch\('\/api\/scout\/places'/)
 assert.doesNotMatch(scout,/byajcqrgetloavrgyqak/)
 assert.doesNotMatch(scout,/const SB_KEY/)
})
