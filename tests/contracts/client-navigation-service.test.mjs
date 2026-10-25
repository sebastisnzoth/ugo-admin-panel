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


test('Client navigation E2E checks PR head and mobile nav against built preview',async()=>{
 const [workflow,runtime]=await Promise.all([read('.github/workflows/client-navigation-runtime.yml'),read('scripts/client-navigation-runtime.mjs')])
 assert.match(workflow,/  pull_request:\\n    branches: \\[main\\]/)
 assert.match(workflow,/UGO_TARGET_SHA: \\$\\{\\{ github\\.event\\.pull_request\\.head\\.sha \\|\\| github\\.sha \\}\\}/)
 assert.match(workflow,/ref: \\$\\{\\{ github\\.event\\.pull_request\\.head\\.sha \\|\\| github\\.sha \\}\\}/)
 assert.match(workflow,/npm run preview -- --host 127\\.0\\.0\\.1 --port 4173 --strictPort/)
 assert.match(workflow,/export UGO_RUNTIME_SHA="\\$\\{UGO_TARGET_SHA\\}"/)
 assert.match(workflow,/UGO_RUNTIME_SHA: \\$\\{\\{ github\\.event\\.pull_request\\.head\\.sha \\|\\| github\\.sha \\}\\}/)
 assert.match(runtime,/async function assertMobileHomeNav\\(page\\)/)
 assert.match(runtime,/if\\(name==='mobile'\\)await assertMobileHomeNav\\(page\\)/)
 assert.match(runtime,/await nav\\.waitFor\\(\\{state:'visible'/)
 assert.match(runtime,/assert\\.equal\\(await buttons\\.count\\(\\),4/)
})
