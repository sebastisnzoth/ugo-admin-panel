import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client post-confirm flow lives behind the request feature boundary with its CSS',async()=>{
 const[flow,shim,need,css]=await Promise.all([
  read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  read('src/mvp/client/ClientPostConfirmFlow.tsx'),
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('src/features/client/request/clientPostConfirm.css')
 ])
 assert.match(flow,/\.\.\/flow\/clientFlow/)
 assert.match(flow,/mvp\/client\/ClientServiceDetail/)
 assert.match(flow,/\.\/clientPostConfirm\.css/)
 assert.match(shim,/features\/client\/request\/ClientPostConfirmFlow/)
 assert.match(need,/\.\/ClientPostConfirmFlow/)
 assert.match(css,/\.ugo-matching-screen/)
 assert.ok(css.length>4900)
})
