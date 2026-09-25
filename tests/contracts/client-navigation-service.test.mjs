import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client root delegates deep links, Sentinel and notice routing to feature navigation',async()=>{const[root,nav,hook]=await Promise.all([read('src/features/client/ClientRoot.tsx'),read('src/features/client/navigation/clientNavigation.ts'),read('src/features/client/navigation/useClientRootNavigation.ts')]);assert.match(root,/useClientRootNavigation/);assert.doesNotMatch(root,/clientDeepLinkedServiceId|clientNoticeDestination|setSentinelContext|clearSentinelContext|setSelectedServiceId/);assert.match(hook,/clientDeepLinkedServiceId/);assert.match(hook,/clientNoticeDestination/);assert.match(hook,/setSentinelContext/);assert.match(hook,/clearSentinelContext/);assert.doesNotMatch(hook,/new URLSearchParams\(window\.location\.search\)\.get\('serviceId'\)/);assert.match(nav,/servicio_completado/);assert.match(nav,/tipo\.includes\('disputa'\)/);assert.match(nav,/kind:'service'/)})

test('service notifications prefer their explicit serviceId, including completion notices',async()=>{
 const nav=await read('src/features/client/navigation/clientNavigation.ts')
 assert.match(nav,/const serviceId=typeof notice\.datos\?\.servicio_id==='string'/)
 assert.match(nav,/if\(serviceId\)return\{kind:'service',serviceId\}/)
 assert.ok(nav.indexOf("if(serviceId)return{kind:'service',serviceId}")<nav.indexOf("if(notice.tipo==='servicio_completado')return{kind:'review'}"))
})
