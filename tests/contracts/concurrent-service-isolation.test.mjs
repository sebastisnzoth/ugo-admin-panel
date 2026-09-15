import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client cancellation mutation boundary requires an explicit owned service id',async()=>{
 const bridge=await read('src/mvp/client/ClientFlowActionsBridge.tsx')
 assert.match(bridge,/const cancelService=async\(serviceId:string\)/)
 assert.match(bridge,/if\(!serviceId\)return false/)
 assert.match(bridge,/\.eq\('id',serviceId\)\.eq\('cliente_id',userId\)/)
 assert.doesNotMatch(bridge,/order\('created_at'[\s\S]*limit\(1\)/)
})

test('Hugo can create another request while services already exist',async()=>{
 const [dock,bridge]=await Promise.all([
  read('src/mvp/client/ClientVoiceHugoDock.tsx'),
  read('src/mvp/client/ClientHugoBridge.tsx'),
 ])
 assert.match(bridge,/setServices\(active\)/)
 assert.match(bridge,/services=\{services\}/)
 assert.match(dock,/request_draft_id:current\.requestDraftId/)
 assert.match(dock,/if\(requestIntent\(clean\)\)\{/)
 assert.doesNotMatch(dock,/Ya tenés el pedido .* activo\. Seguilo o cancelalo antes de crear otro/)
 assert.doesNotMatch(dock,/Você já tem o pedido .* ativo/)
})

test('Hugo cancellation resolves one concrete service before mutation',async()=>{
 const dock=await read('src/mvp/client/ClientVoiceHugoDock.tsx')
 assert.match(dock,/resolveServiceCandidates\(source,services,true\)/)
 assert.match(dock,/pendingCancel\.current=\{kind:'service',serviceId:candidates\[0\]\.id/)
 assert.match(dock,/clientActions\?\.cancelService\(pending\.serviceId\)/)
 assert.doesNotMatch(dock,/clientActions\?\.cancelService\(\)/)
})

test('participant disputes use the selected service or refuse ambiguity',async()=>{
 const [hook,dock,detail]=await Promise.all([
  read('src/hooks/useDisputes.ts'),
  read('src/mvp/DisputeDock.tsx'),
  read('src/mvp/client/ClientServiceDetail.tsx'),
 ])
 assert.match(hook,/useParticipantDispute\(role:UgoRole,serviceId\?:string\|null\)/)
 assert.match(hook,/if\(!serviceId&&rows\.length>1\)/)
 assert.match(dock,/useParticipantDispute\(role,serviceId\)/)
 assert.match(detail,/DisputeDock role="client" serviceId=\{service\.id\}/)
})

test('provider agenda exposes each scheduled service by its own id',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/setSelectedId\(row\.id\)/)
 assert.match(agenda,/ServiceChat role="provider" serviceId=\{selected\.id\}/)
 assert.match(agenda,/Este detalle está ligado al serviceId exacto/)
})
