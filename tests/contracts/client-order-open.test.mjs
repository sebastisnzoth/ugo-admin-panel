import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=fs.readFileSync('src/mvp/client/ClientRoot.tsx','utf8')
const rootNavigation=fs.readFileSync('src/features/client/navigation/useClientRootNavigation.ts','utf8')
const history=fs.readFileSync('src/mvp/ServiceHistoryPanel.tsx','utf8')
const detail=fs.readFileSync('src/mvp/client/ClientServiceDetail.tsx','utf8')
const map=fs.readFileSync('src/mvp/ClientActiveMap.tsx','utf8')

test('Activity opens the exact serviceId under the CLIENT-ORDER-OPEN sentinel context',()=>{
 assert.match(history,/onClick=\{\(\)=>onOpenService\(r\.id\)\}>Abrir pedido y chat<\/button>/)
 assert.match(rootNavigation,/const openService=useCallback\(\(serviceId:string\)=>\{setSentinelContext\(\{role:'client',serviceId,action:'client\.activity\.open_order',checklistCode:'CLIENT-ORDER-OPEN',severity:'P0'\}\);setSelectedServiceId\(serviceId\)\}/)
 assert.match(root,/ClientServiceDetail serviceId=\{selectedServiceId\}/)
})

test('order detail is scoped to the authenticated client and selected service',()=>{
 assert.match(detail,/\.eq\('id',serviceId\)\.eq\('cliente_id',user\.id\)\.maybeSingle\(\)/)
 assert.match(detail,/checklistCode:'CLIENT-ORDER-OPEN'/)
 assert.match(detail,/eventType:'client_order_load_error'/)
})

test('chat remains ahead of embedded tracking and each module is isolated',()=>{
 const chat=detail.indexOf('<ServiceChat role="client" serviceId={service.id} compact/>')
 const tracking=detail.indexOf('<ClientLiveTracking serviceId={service.id} embedded/>')
 assert.ok(chat>=0,'service chat must be mounted in order detail')
 assert.ok(tracking>=0,'embedded tracking must be mounted in order detail')
 assert.ok(chat<tracking,'chat must render before tracking so map failures cannot hide it')
 assert.match(detail,/SentinelErrorBoundary role="client" serviceId=\{service\.id\} action="client\.order\.chat"/)
 assert.match(detail,/SentinelErrorBoundary role="client" serviceId=\{service\.id\} action="client\.order\.tracking"/)
})

test('map failure stays local instead of replacing the order or chat',()=>{
 assert.match(map,/const FALLBACK='El mapa en vivo no está disponible ahora\. El pedido y el chat siguen funcionando\.'/)
 assert.match(map,/if\(mapError\)return <div className="ugo-active-map-fallback"/)
})
