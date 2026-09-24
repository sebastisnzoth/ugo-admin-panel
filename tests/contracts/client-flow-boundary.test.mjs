import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client flow state is canonical behind the client feature boundary',async()=>{
 const[flow,root,app,legacyRoot]=await Promise.all([
  read('src/features/client/flow/clientFlow.tsx'),
  read('src/features/client/ClientRoot.tsx'),
  read('src/mvp/MvpApp.tsx'),
  read('src/mvp/client/ClientRoot.tsx')
 ])
 assert.match(flow,/createContext<ClientFlow/)
 assert.match(flow,/useClientCategoryShortcut/)
 assert.match(root,/\.\/flow\/clientFlow/)
 assert.match(app,/features\/client\/flow\/clientFlow/)
 assert.doesNotMatch(root,/ClientStudioNavbar|ClientStudioProviderRadar/)
 assert.match(root,/\.\/payments\/DemoSebastianPaymentBridge/)
 assert.doesNotMatch(root,/mvp\/client/)
 assert.match(app,/features\/client\/ClientRoot/)
 assert.doesNotMatch(app,/\.\/client\/ClientRoot/)
 assert.match(legacyRoot,/features\/client\/ClientRoot/)
 assert.doesNotMatch(legacyRoot,/useClientFlow|ClientOperationalSurfaces/)
})

test('migrated client features consume the canonical flow boundary directly',async()=>{
 const files=await Promise.all([
  read('src/features/client/actions/ClientFlowActionsBridge.tsx'),
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/features/client/profile/ClientProfilePanel.tsx'),
  read('src/features/client/request/ClientNeedScreen.tsx')
 ])
 for(const source of files){
  assert.match(source,/\.\.\/flow\/clientFlow/)
  assert.doesNotMatch(source,/mvp\/client\/clientFlow/)
 }
})
