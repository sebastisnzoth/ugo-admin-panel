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


test('Hugo can create another request while services already exist',()=>{assert.match(hugo,/name==='set_request_category'/);assert.match(hugo,/emptyVoiceDraft\(null\)/);assert.match(hugo,/name==='create_service_request'/);assert.doesNotMatch(hugo,/cancelarlo antes de crear otro/)})

test('each canonical request persists its own generated service id and matching scope',async()=>{
 const postConfirm=await read('src/features/client/request/ClientPostConfirmFlow.tsx')
 assert.match(postConfirm,/requestDraftId=crypto\.randomUUID\(\)/)
 assert.match(postConfirm,/supabase\.from\('servicios'\)\.insert\(\{cliente_id:session\.user\.id[\s\S]*estado:'buscando'/)
 assert.match(postConfirm,/\.select\('id,numero,estado,proveedor_id'\)\.single\(\)/)
 assert.match(postConfirm,/if\(!row\?\.id\)throw new Error/)
 assert.match(postConfirm,/startDispatch\(row\.id,context\)/)
 assert.match(postConfirm,/filter:\`id=eq\.\$\{id\}\`/)
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
  read('src/features/client/order/ClientServiceDetail.tsx'),
 ])
 assert.match(nav,/setSelectedServiceId\(serviceId\)/)
 assert.match(root,/selectedServiceId&&<ClientOrderDetailBoundary serviceId=\{selectedServiceId\} onClose=\{closeService\}/)
 assert.match(boundary,/ClientServiceDetail serviceId=\{serviceId\} onClose=\{onClose\}/)
 assert.match(detail,/serviceId=\{service\.id\}/)
 assert.match(detail,/ServiceChat role="client" serviceId=\{service\.id\}/)
})

test('Hugo cancellation resolves one concrete service before mutation',async()=>{
 const dock=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx')
 assert.match(dock,/resolveServiceCandidates\(source,services,true\)/)
 assert.match(dock,/pendingCancel\.current=\{kind:'service',serviceId:candidates\[0\]\.id/)
 assert.match(dock,/clientActions\?\.cancelService\(pending\.serviceId\)/)
 assert.doesNotMatch(dock,/clientActions\?\.cancelService\(\)/)
})

test('participant disputes use the selected service or refuse ambiguity',async()=>{
 const[hook,dock,detail]=await Promise.all([
  read('src/hooks/useDisputes.ts'),
  read('src/mvp/DisputeDock.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
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
