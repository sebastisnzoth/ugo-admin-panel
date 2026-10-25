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
 const shaExpr='github.event.pull_request.head.sha || github.sha'
 assert.ok(workflow.includes('  pull_request:\n    branches: [main]'))
 assert.ok(workflow.includes('UGO_TARGET_SHA: ')&&workflow.includes(shaExpr))
 assert.ok(workflow.includes('ref: ')&&workflow.includes(shaExpr))
 assert.ok(workflow.includes('npm run preview -- --host 127.0.0.1 --port 4173 --strictPort'))
 assert.ok(workflow.includes('export UGO_RUNTIME_SHA=')&&workflow.includes('UGO_TARGET_SHA'))
 assert.ok(workflow.includes('UGO_RUNTIME_SHA: ')&&workflow.includes(shaExpr))
 assert.ok(runtime.includes('async function assertMobileHomeNav(page)'))
 assert.ok(runtime.includes("if(name==='mobile')await assertMobileHomeNav(page)"))
 assert.ok(runtime.includes("await nav.waitFor({state:'visible'"))
 assert.ok(runtime.includes('assert.equal(await buttons.count(),4'))
})


test('Client request menu opens composer instead of removed search',async()=>{
 const [menu,root,need,runtime]=await Promise.all([
  read('src/features/client/ui/ClientGlobalMenu.tsx'),
  read('src/features/client/ClientRoot.tsx'),
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('scripts/client-navigation-runtime.mjs')
 ])
 assert.ok(menu.includes("const request=()=>{close();flow.navigate('request')}"))
 assert.ok(root.includes("flow.screen==='request'&&<ClientNeedScreen/>"))
 assert.ok(need.includes('className="ugo-need-screen"'))
 assert.ok(need.includes('id="ugo-need-description"'))
 assert.ok(runtime.includes("page.locator('main.ugo-need-screen')"))
 assert.ok(runtime.includes("requestForm.locator('#ugo-need-description')"))
 assert.ok(runtime.includes("requestForm.locator('.ugo-need-top button').first().click()"))
 assert.ok(!runtime.includes("getByRole('textbox',{name:'Buscar servicio'})"))
 const p0Workflow=await read('.github/workflows/p0-client-provider-e2e.yml')
 assert.ok(p0Workflow.includes('"src/features/client/ui/ClientGlobalMenu.tsx"'),'menu request changes must run P0 matching E2E')
})


test('Hugo menu action has a stable selector and validates the visible translated label',async()=>{
 const [menu,runtime,locale]=await Promise.all([
  read('src/features/client/ui/ClientGlobalMenu.tsx'),
  read('scripts/client-navigation-runtime.mjs'),
  read('src/i18n/locale.tsx'),
 ])
 assert.match(menu,/data-client-menu-action="hugo"/)
 assert.match(runtime,/button\[data-client-menu-action="hugo"\]/)
 assert.match(runtime,/Hugo \/ Asistente IA/)
 assert.match(runtime,/Hugo \/ Assistente IA/)
 assert.match(runtime,/Hugo \/ AI Assistant/)
 assert.match(runtime,/page\.locator\('html'\)\.getAttribute\('lang'\)/)
 assert.match(runtime,/assert\.equal\(actualLabel,hugoLabels\[activeLocale\]/)
 assert.match(locale,/"clientMenu\.assistant":"Hugo \/ Asistente IA"/)
 assert.match(locale,/"clientMenu\.assistant":"Hugo \/ Assistente IA"/)
 assert.match(locale,/"clientMenu\.assistant":"Hugo \/ AI Assistant"/)
})
