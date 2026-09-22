import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client request need screen lives behind the request feature boundary',async()=>{const[root,need,css]=await Promise.all([read('src/mvp/client/ClientRoot.tsx'),read('src/features/client/request/ClientNeedScreen.tsx'),read('src/features/client/request/clientNeedScreen.css')]);assert.match(root,/features\/client\/request\/ClientNeedScreen/);assert.doesNotMatch(root,/from'\.\/ClientNeedScreen'/);assert.match(need,/useClientFlow/);assert.match(need,/ClientLocationScreen/);assert.match(need,/ClientPostConfirmFlow/);assert.match(need,/ClientRequestEvidence/);assert.match(need,/clientNeedScreen\.css/);assert.match(css,/\.ugo-need-screen/);assert.ok(css.length>6500)})
