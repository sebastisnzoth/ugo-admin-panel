import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client root delegates deep links and notice routing to feature navigation',async()=>{const[root,nav]=await Promise.all([read('src/mvp/client/ClientRoot.tsx'),read('src/features/client/navigation/clientNavigation.ts')]);assert.match(root,/clientDeepLinkedServiceId/);assert.match(root,/clientNoticeDestination/);assert.doesNotMatch(root,/new URLSearchParams\(window\.location\.search\)\.get\('serviceId'\)/);assert.match(nav,/servicio_completado/);assert.match(nav,/tipo\.includes\('disputa'\)/);assert.match(nav,/kind:'service'/)})
