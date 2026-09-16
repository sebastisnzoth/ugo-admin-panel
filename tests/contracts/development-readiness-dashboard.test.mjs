import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const app=fs.readFileSync('src/mvp/MvpApp.tsx','utf8')
const dashboard=fs.readFileSync('src/mvp/DevelopmentDashboard.tsx','utf8')
const landing=fs.readFileSync('public/landing/index.html','utf8')
const migration=fs.readFileSync('supabase/migrations/20260915070000_development_readiness_dashboard.sql','utf8')
const publicMigration=fs.readFileSync('supabase/migrations/20260916001000_public_development_dashboard.sql','utf8')

test('public landing exposes the requested Desarrollo entrypoint',()=>{
 assert.match(landing,/>Desarrollo<\/a>/)
 assert.match(landing,/href="\/\?app=development"/)
})

test('development dashboard is public while Admin remains gated',()=>{
 assert.match(app,/if\(app==='development'\)return <Deferred><DevelopmentDashboard\/><\/Deferred>/)
 assert.doesNotMatch(app,/if\(app==='development'\).*AdminGate/)
 assert.match(app,/if\(app==='admin'\)return <Deferred><AdminGate\/><\/Deferred>/)
})

test('verified readiness counts only approved weighted checklist items',()=>{
 assert.match(dashboard,/items\.filter\(item=>item\.status==='approved'\).*reduce/)
 assert.doesNotMatch(dashboard,/status==='implemented'.*approvedWeight/)
 assert.match(dashboard,/has_evidence/)
})

test('READY is truthful and only current-build Sentinel risk blocks the candidate',()=>{
 assert.match(dashboard,/const currentIncidents=incidents\.filter\(item=>item\.status!=='resolved'&&isCurrentRevision\(item\)\)/)
 assert.match(dashboard,/const releaseReady=!error&&items\.length>0&&stats\.p0Open===0&&stats\.p1Open===0&&stats\.sentinelP0===0&&stats\.sentinelP1===0/)
 assert.match(dashboard,/releaseReady\?'READY':'NOT READY'/)
 assert.match(dashboard,/runtime_revision/)
 assert.match(dashboard,/BUILD ACTUAL/)
})

test('private readiness tables stay admin-only',()=>{
 assert.match(migration,/alter table public\.development_checklist enable row level security/)
 assert.match(migration,/using \(private\.is_admin\(auth\.uid\(\)\)\)/)
 assert.match(migration,/development_checklist_events/)
})

test('public dashboard uses sanitized read-only views and a non-sensitive realtime signal',()=>{
 assert.match(publicMigration,/development_checklist_public/)
 assert.match(publicMigration,/development_incidents_public/)
 assert.match(publicMigration,/service IDs, stack traces, metadata and reporter IDs are intentionally omitted/i)
 assert.match(publicMigration,/grant select on table public\.development_checklist_public to anon, authenticated/i)
 assert.match(publicMigration,/development_dashboard_signal_public_select/)
 assert.match(publicMigration,/alter publication supabase_realtime add table public\.development_dashboard_signal/i)
 assert.match(dashboard,/from\('development_checklist_public'\)/)
 assert.match(dashboard,/from\('development_incidents_public'\)/)
 assert.match(dashboard,/table:'development_dashboard_signal'/)
})

test('retired hosting path no longer blocks UGO readiness',()=>{
 assert.match(publicMigration,/delete from public\.development_checklist[\s\S]*NETLIFY-MAIN-SYNC/)
})

test('first-client P0 chat failures are represented explicitly',()=>{
 assert.match(migration,/\('CHAT-REALTIME','Chat','Chat Cliente ↔ Proveedor bidireccional'.*'P0','failed'/)
 assert.match(migration,/\('CHAT-QUICK','Chat','Respuestas rápidas estilo Uber'.*'P0','pending'/)
 assert.match(migration,/\('CHAT-CONTACT','Chat','Bloqueo de datos de contacto'.*'P0','pending'/)
})
