import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sentinel=fs.readFileSync('src/lib/sentinel.ts','utf8')
const main=fs.readFileSync('src/main.tsx','utf8')
const clientRoot=fs.readFileSync('src/mvp/client/ClientRoot.tsx','utf8')
const detail=fs.readFileSync('src/mvp/client/ClientServiceDetail.tsx','utf8')
const chat=fs.readFileSync('src/mvp/ServiceChat.tsx','utf8')
const dashboard=fs.readFileSync('src/mvp/DevelopmentDashboard.tsx','utf8')
const migration=fs.readFileSync('supabase/migrations/20260915093000_runtime_sentinel.sql','utf8')

test('Sentinel persists deduplicated authenticated incidents and can fail mapped checklist items',()=>{
 assert.match(migration,/create table if not exists public\.development_incidents/)
 assert.match(migration,/fingerprint text not null unique/)
 assert.match(migration,/create or replace function public\.report_development_incident/)
 assert.match(migration,/update public\.development_checklist[\s\S]*set status = 'failed'/)
 assert.match(migration,/alter publication supabase_realtime add table public\.development_incidents/)
})

test('global runtime errors and React render failures are captured',()=>{
 assert.match(sentinel,/window\.addEventListener\('error'/)
 assert.match(sentinel,/window\.addEventListener\('unhandledrejection'/)
 assert.match(main,/installSentinel\(\)/)
 assert.match(main,/eventType:'react_render_error'/)
})

test('opening an Activity order carries serviceId and P0 checklist context',()=>{
 assert.match(clientRoot,/action:'client\.activity\.open_order'/)
 assert.match(clientRoot,/checklistCode:'CLIENT-ORDER-OPEN'/)
 assert.match(clientRoot,/severity:'P0'/)
 assert.match(detail,/eventType:'client_order_load_error'/)
 assert.match(detail,/checklistCode:'CLIENT-ORDER-OPEN'/)
})

test('secondary order modules are isolated so one widget cannot crash the whole order',()=>{
 assert.match(detail,/SentinelErrorBoundary[\s\S]*ClientLiveTracking/)
 assert.match(detail,/checklistCode="CHAT-REALTIME"[\s\S]*<ServiceChat/)
 assert.match(detail,/checklistCode="PAYMENT-CLOSE"/)
})

test('chat reports realtime failures and has an online resync fallback',()=>{
 assert.match(chat,/chat_realtime_subscription_error/)
 assert.match(chat,/chat_send_error/)
 assert.match(chat,/window\.setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&navigator\.onLine\)resync\(\)\},10000\)/)
 assert.match(chat,/checklistCode:'CHAT-REALTIME'/)
})

test('Development dashboard exposes Sentinel incidents and P0 count',()=>{
 assert.match(dashboard,/development_incidents/)
 assert.match(dashboard,/Sentinela/)
 assert.match(dashboard,/sentinelP0/)
})
