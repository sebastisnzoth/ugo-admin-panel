import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const sentinel=fs.readFileSync(new URL('../../src/lib/sentinel.ts',import.meta.url),'utf8')
const service=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')
const chat=fs.readFileSync(new URL('../../src/mvp/ServiceChat.tsx',import.meta.url),'utf8')
const clientRoot=fs.readFileSync(new URL('../../src/mvp/client/ClientRoot.tsx',import.meta.url),'utf8')
const clientRootNavigation=fs.readFileSync(new URL('../../src/features/client/navigation/useClientRootNavigation.ts',import.meta.url),'utf8')
const detail=fs.readFileSync(new URL('../../src/mvp/client/ClientServiceDetail.tsx',import.meta.url),'utf8')
const dashboard=fs.readFileSync(new URL('../../src/mvp/DevelopmentDashboard.tsx',import.meta.url),'utf8')

test('Sentinel carries build revision and sanitizes runtime payloads',()=>{
 assert.match(sentinel,/VITE_APP_REVISION/)
 assert.match(sentinel,/runtimeRevision/)
 assert.match(sentinel,/function redactText/)
 assert.match(sentinel,/function safeMetadata/)
 assert.match(sentinel,/PRIVATE_METADATA_KEYS/)
 assert.match(sentinel,/\[dato protegido\]/)
 assert.match(sentinel,/\[contacto protegido\]/)
})

test('anonymous public-page failures stay local until an authorized session exists',()=>{
 assert.match(sentinel,/localStorage/)
 assert.match(sentinel,/anonymous/i)
 assert.match(sentinel,/flush/i)
 assert.match(sentinel,/getSession/)
})

test('global runtime failures are captured',()=>{
 assert.match(sentinel,/unhandledrejection/)
 assert.match(sentinel,/addEventListener\('error'/)
})

test('provider lifecycle errors reconcile persistence before Sentinel P0',()=>{
 assert.match(service,/persistedProviderTransition/)
 assert.match(service,/if\(persisted===true\)return/)
 assert.match(service,/persisted===false[\s\S]*provider_service_state_error/)
 assert.match(service,/provider_service_state_recovery_unverified/)
})

test('opening an Activity order carries serviceId and P0 checklist context',()=>{
 assert.match(clientRoot,/useClientRootNavigation/)
 assert.match(clientRootNavigation,/action:'client\.activity\.open_order'/)
 assert.match(clientRootNavigation,/checklistCode:'CLIENT-ORDER-OPEN'/)
 assert.match(clientRootNavigation,/severity:'P0'/)
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
 assert.match(chat,/function shouldEscalate\(\)\{return document\.visibilityState==='visible'&&navigator\.onLine\}/)
 assert.match(chat,/window\.setInterval\(\(\)=>\{if\(shouldEscalate\(\)\)resync\(\)\},10000\)/)
 assert.match(chat,/checklistCode:'CHAT-REALTIME'/)
})

test('Development dashboard exposes current-build Sentinel incidents and P0 count',()=>{
 assert.match(dashboard,/development_incidents_public/)
 assert.match(dashboard,/isCurrentRevision/)
 assert.match(dashboard,/Sentinela/)
 assert.match(dashboard,/sentinelP0/)
})
