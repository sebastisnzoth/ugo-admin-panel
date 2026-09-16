import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sentinel=fs.readFileSync('src/lib/sentinel.ts','utf8')
const main=fs.readFileSync('src/main.tsx','utf8')
const clientRoot=fs.readFileSync('src/mvp/client/ClientRoot.tsx','utf8')
const detail=fs.readFileSync('src/mvp/client/ClientServiceDetail.tsx','utf8')
const chat=fs.readFileSync('src/mvp/ServiceChat.tsx','utf8')
const dashboard=fs.readFileSync('src/mvp/DevelopmentDashboard.tsx','utf8')
const vite=fs.readFileSync('vite.config.ts','utf8')
const migration=fs.readFileSync('supabase/migrations/20260915093000_runtime_sentinel.sql','utf8')
const guardrails=fs.readFileSync('supabase/migrations/20260915093100_runtime_sentinel_guardrails.sql','utf8')
const revisionIsolation=fs.readFileSync('supabase/migrations/20260915200000_runtime_sentinel_revision_isolation.sql','utf8')
const actionClassification=fs.readFileSync('supabase/migrations/20260916002000_sentinel_action_classification.sql','utf8')
const providerPaymentClassification=fs.readFileSync('supabase/migrations/20260916003000_sentinel_provider_payment_classification.sql','utf8')
const providerAgendaClassification=fs.readFileSync('supabase/migrations/20260916004000_sentinel_provider_agenda_classification.sql','utf8')

test('Sentinel persists deduplicated authenticated incidents and publishes them realtime',()=>{
 assert.match(migration,/create table if not exists public\.development_incidents/)
 assert.match(migration,/fingerprint text not null unique/)
 assert.match(migration,/create or replace function public\.report_development_incident/)
 assert.match(migration,/alter publication supabase_realtime add table public\.development_incidents/)
})

test('participant incidents are service-scoped and cannot choose arbitrary checklist classifications',()=>{
 assert.match(guardrails,/private\.is_service_participant\(p_service_id, auth\.uid\(\)\)/)
 assert.match(guardrails,/when p_action = 'client\.activity\.open_order' then 'CLIENT-ORDER-OPEN'/)
 assert.match(guardrails,/when p_action in \('client\.service\.chat','provider\.service\.chat','client\.order\.chat','provider\.order\.chat'\) then 'CHAT-REALTIME'/)
 assert.match(guardrails,/when v_is_admin then p_checklist_code/)
})

test('core runtime actions are classified server-side instead of trusting browser checklist proposals',()=>{
 for(const [action,code] of [
  ['client.request.matching','MATCH-ONLINE'],
  ['client.request.cancel','CLIENT-CANCEL'],
  ['client.request.location','MAP-GPS'],
  ['provider.offer.accept','PROVIDER-ASSIGN'],
  ['provider.service.advance','PROVIDER-STATES'],
  ['provider.service.location','MAP-GPS'],
 ])assert.match(actionClassification,new RegExp(`p_action = '${action.replaceAll('.','\\.')}' then '${code}'`))
 assert.match(actionClassification,/p_action in \('client\.rating\.submit','provider\.rating\.submit'\) then 'RATING'/)
 assert.match(providerPaymentClassification,/p_action in \('client\.order\.payment','provider\.payment\.cash_confirm'\) then 'PAYMENT-CLOSE'/)
 assert.match(providerAgendaClassification,/p_action = 'provider\.agenda\.load' then 'PROVIDER-AGENDA'/)
 assert.match(providerAgendaClassification,/when v_is_admin then p_checklist_code/)
 assert.doesNotMatch(providerAgendaClassification,/update public\.development_checklist/)
})

test('runtime incidents are revision-tagged and cannot mutate release checklist state',()=>{
 assert.match(revisionIsolation,/add column if not exists runtime_revision text/)
 assert.match(revisionIsolation,/p_metadata->>'runtimeRevision'/)
 assert.match(revisionIsolation,/coalesce\(v_runtime_revision,'unversioned'\)/)
 assert.match(revisionIsolation,/Deliberately do not update development_checklist here/)
 assert.doesNotMatch(revisionIsolation,/update public\.development_checklist/)
 assert.match(sentinel,/VITE_APP_REVISION/)
 assert.match(sentinel,/runtimeRevision:RUNTIME_REVISION/)
 assert.match(vite,/VERCEL_GIT_COMMIT_SHA/)
 assert.match(vite,/GITHUB_SHA/)
})

test('Sentinel strips contact, credential and URL data before persistence',()=>{
 assert.match(sentinel,/PRIVATE_METADATA_KEYS/)
 for(const key of ['token','authorization','email','phone','messagecontent','password','secret','apikey','api_key'])assert.match(sentinel,new RegExp(`['\"]${key}['\"]`))
 assert.match(sentinel,/function redactText/)
 assert.match(sentinel,/Bearer \[protegido\]/)
 assert.match(sentinel,/\[dato protegido\]/)
 assert.match(sentinel,/\[enlace protegido\]/)
 assert.match(sentinel,/\[contacto protegido\]/)
})

test('anonymous public-page failures are retained locally without anonymous database writes',()=>{
 assert.match(sentinel,/ANON_QUEUE_KEY/)
 assert.match(sentinel,/MAX_ANON_QUEUE=20/)
 assert.match(sentinel,/queueAnonymousIncident\(payload\)/)
 assert.match(sentinel,/p_severity:'P2'/)
 assert.match(sentinel,/p_service_id:null/)
 assert.match(sentinel,/p_checklist_code:null/)
 assert.match(sentinel,/flushAnonymousQueueWithClient/)
 assert.match(sentinel,/window\.setInterval\(\(\)=>void flushAnonymousQueue\(\),30000\)/)
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

test('Development dashboard exposes current-build Sentinel incidents and P0 count',()=>{
 assert.match(dashboard,/development_incidents_public/)
 assert.match(dashboard,/isCurrentRevision/)
 assert.match(dashboard,/Sentinela/)
 assert.match(dashboard,/sentinelP0/)
})
