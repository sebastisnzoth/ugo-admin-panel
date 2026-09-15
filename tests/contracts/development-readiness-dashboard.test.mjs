import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const app=fs.readFileSync('src/mvp/MvpApp.tsx','utf8')
const dashboard=fs.readFileSync('src/mvp/DevelopmentDashboard.tsx','utf8')
const landing=fs.readFileSync('public/landing/index.html','utf8')
const migration=fs.readFileSync('supabase/migrations/20260915070000_development_readiness_dashboard.sql','utf8')

test('public landing exposes the requested Desarrollo entrypoint',()=>{
 assert.match(landing,/>Desarrollo<\/a>/)
 assert.match(landing,/href="\/\?app=development"/)
})

test('development dashboard is routed behind the reusable Admin gate',()=>{
 assert.match(app,/if\(app==='development'\)return <Deferred><AdminGate><DevelopmentDashboard\/><\/AdminGate><\/Deferred>/)
})

test('verified readiness counts only approved weighted checklist items',()=>{
 assert.match(dashboard,/items\.filter\(item=>item\.status==='approved'\).*reduce/)
 assert.match(dashboard,/No se puede aprobar .* sin evidencia de prueba/)
 assert.doesNotMatch(dashboard,/status==='implemented'.*approvedWeight/)
})

test('development checklist is admin-only, auditable and realtime',()=>{
 assert.match(migration,/alter table public\.development_checklist enable row level security/)
 assert.match(migration,/using \(private\.is_admin\(auth\.uid\(\)\)\)/)
 assert.match(migration,/development_checklist_events/)
 assert.match(migration,/alter publication supabase_realtime add table public\.development_checklist/)
})

test('first-client P0 chat failures are represented explicitly',()=>{
 assert.match(migration,/\('CHAT-REALTIME','Chat','Chat Cliente ↔ Proveedor bidireccional'.*'P0','failed'/)
 assert.match(migration,/\('CHAT-QUICK','Chat','Respuestas rápidas estilo Uber'.*'P0','pending'/)
 assert.match(migration,/\('CHAT-CONTACT','Chat','Bloqueo de datos de contacto'.*'P0','pending'/)
})
