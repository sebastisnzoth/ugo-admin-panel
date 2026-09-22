import test from 'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client cancellation mutation boundary requires an explicit owned service id',async()=>{
 const[bridge,service]=await Promise.all([read('src/features/client/actions/ClientFlowActionsBridge.tsx'),read('src/features/client/services/clientActionService.ts')])
 assert.match(bridge,/const cancelService=async\(serviceId:string\)/)
 assert.match(bridge,/cancelOwnedClientService\(supabase,userId,serviceId\)/)
 assert.match(service,/if\(!serviceId\)return false/)
 assert.match(service,/\.eq\('id',serviceId\)\.eq\('cliente_id',userId\)/)
 assert.doesNotMatch(service,/order\('created_at'[\s\S]*limit\(1\)/)
})

test('Hugo can create another request while services already exist',async()=>{
 const[dock,bridge,guided]=await Promise.all([
  read('src/mvp/client/ClientVoiceHugoDock.tsx'),
  read('src/mvp/client/ClientHugoBridge.tsx'),
  read('src/mvp/client/ClientGuidedRequest.tsx'),
 ])
 assert.match(bridge,/setServices\(active\)/)
 assert.match(bridge,/services=\{services\}/)
 assert.match(dock,/request_draft_id:current\.requestDraftId/)
 assert.match(dock,/if\(suggested\|\|newRequestIntent\(clean\)\|\|companion\?\.action==='prepare_request'/)
 assert.doesNotMatch(dock,/Ya tenés el pedido .* activo\. Seguilo o cancelalo antes de crear otro/)
 assert.doesNotMatch(dock,/Você já tem o pedido .* ativo/)
 assert.match(guided,/const nextDraftId=crypto\.randomUUID\(\);setDraftId\(nextDraftId\)/)
 assert.match(guided,/setCurrentCreatingServiceId\(''\)/)
 assert.match(guided,/setDraft\(emptyDraft\)/)
})

test('each guided request persists its own generated service id and matching scope',async()=>{
 const guided=await read('src/mvp/client/ClientGuidedRequest.tsx')
 assert.match(guided,/\.insert\(\{cliente_id:session\.user\.id[\s\S]*estado:'buscando'/)
 assert.match(guided,/\.select\('id'\)\.single\(\)/)
 assert.match(guided,/const serviceId=String\(data\.id\)/)
 assert.match(guided,/setCurrentCreatingServiceId\(serviceId\)/)
 assert.match(guided,/getDispatchProvider\(\)\.start\(\{serviceId,category:/)
 assert.match(guided,/filter:`id=eq\.\$\{serviceId\}`/)
})

test('Activity lists all owned orders and opens or cancels one exact service id',async()=>{
 const history=await read('src/mvp/ServiceHistoryPanel.tsx')
 assert.match(history,/\.eq\('cliente_id',userId\)/)
 assert.match(history,/\.limit\(role==='admin'\?200:80\)/)
 assert.match(history,/visible\.map\(r=>/)
 assert.match(history,/onOpenService\(r\.id\)/)
 assert.match(history,/cancelClientService\(r\.id\)/)
 assert.match(history,/rows\.find\(row=>row\.id===serviceId&&row\.cliente_id===userId\)/)
})

test('client exact-order detail does not mix operational surfaces from another service',async()=>{
 const[root,nav,boundary,detail]=await Promise.all([
  read('src/mvp/client/ClientRoot.tsx'),
  read('src/features/client/navigation/useClientRootNavigation.ts'),
  read('src/features/client/ui/ClientOrderDetailBoundary.tsx'),
  read('src/mvp/client/ClientServiceDetail.tsx'),
 ])
 assert.match(nav,/setSelectedServiceId\(serviceId\)/)
 assert.match(root,/selectedServiceId&&<ClientOrderDetailBoundary serviceId=\{selectedServiceId\} onClose=\{closeService\}/)
 assert.match(boundary,/ClientServiceDetail serviceId=\{serviceId\} onClose=\{onClose\}/)
 assert.match(detail,/serviceId=\{service\.id\}/)
 assert.match(detail,/ServiceChat role="client" serviceId=\{service\.id\}/)
})

test('Hugo cancellation resolves one concrete service before mutation',async()=>{
 const dock=await read('src/mvp/client/ClientVoiceHugoDock.tsx')
 assert.match(dock,/resolveServiceCandidates\(source,services,true\)/)
 assert.match(dock,/pendingCancel\.current=\{kind:'service',serviceId:candidates\[0\]\.id/)
 assert.match(dock,/clientActions\?\.cancelService\(pending\.serviceId\)/)
 assert.doesNotMatch(dock,/clientActions\?\.cancelService\(\)/)
})

test('participant disputes use the selected service or refuse ambiguity',async()=>{
 const[hook,dock,detail]=await Promise.all([
  read('src/hooks/useDisputes.ts'),
  read('src/mvp/DisputeDock.tsx'),
  read('src/mvp/client/ClientServiceDetail.tsx'),
 ])
 assert.match(hook,/useParticipantDispute\(role:UgoRole,serviceId\?:string\|null\)/)
 assert.match(hook,/if\(!serviceId&&rows\.length>1\)/)
 assert.match(dock,/useParticipantDispute\(role,serviceId\)/)
 assert.match(detail,/DisputeDock role="client" serviceId=\{service\.id\}/)
})

test('provider agenda exposes each assigned service by its own id',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/setSelectedId\(row\.id\)/)
 assert.match(agenda,/ServiceChat role="provider" serviceId=\{selected\.id\}/)
 assert.match(agenda,/Todos los cambios se aplican únicamente al serviceId/)
 assert.match(agenda,/advanceProviderService\(db,selected\.id,target\)/)
 assert.match(agenda,/cancelProviderService\(db,selected\.id,cancelReason\)/)
})
