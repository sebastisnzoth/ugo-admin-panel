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


test('Hugo menu action validates effective locale after the later UI copy catalog override',async()=>{
 const [menu,runtime,locale,core,copy]=await Promise.all([
  read('src/features/client/ui/ClientGlobalMenu.tsx'),
  read('scripts/client-navigation-runtime.mjs'),
  read('src/i18n/locale.tsx'),
  read('src/i18n/translations/core.ts'),
  read('src/i18n/translations/uiCopyCleanup.ts'),
 ])
 assert.ok(menu.includes('data-client-menu-action="hugo"'))
 assert.ok(runtime.includes('button[data-client-menu-action="hugo"]'))
 assert.ok(runtime.includes("page.locator('html').getAttribute('lang')"))
 assert.ok(runtime.includes('assert.equal(actualLabel,hugoLabels[activeLocale]'))
 for(const language of ["'pt-BR'",'es','en']){
  assert.ok(core.includes('...uiCopyCleanupMessages['+language+']')||core.includes('...uiCopyCleanupMessages.'+language),'effective catalog must contain late UI copy override: '+language)
 }
 assert.ok(locale.includes('Object.assign(messages[locale],coreMessages[locale])'))
 const expected={
  es:'Asistente de Hugo',
  'pt-BR':'Assistente Hugo',
  en:'Hugo assistant',
 }
 for(const [language,label] of Object.entries(expected)){
  assert.ok(copy.includes("'clientMenu.assistant':'"+label+"'"),language+': effective UI copy missing')
  assert.ok(runtime.includes("'"+language+"':'"+label+"'"),language+': E2E expectation must match effective UI copy')
 }
})


test('notification panel is closed through the real UI before subsequent menu actions',async()=>{
 const [runtime,center]=await Promise.all([
  read('scripts/client-navigation-runtime.mjs'),
  read('src/mvp/NotificationCenter.tsx'),
 ])
 assert.ok(center.includes("className=\"ugo-notification-close\""),'notification panel must expose its real close control')
 assert.ok(center.includes("setOpen(false)"),'close control must dismiss the panel')
 const open=runtime.indexOf("await clickMenu(page,'Notificaciones')")
 const close=runtime.indexOf("await notificationClose.click()",open)
 const next=runtime.indexOf("for(const item of ['Hugo / Asistente IA'",open)
 assert.ok(open>=0&&close>open&&next>close,'E2E must dismiss notifications before reopening the menu')
 assert.ok(runtime.slice(open,next).includes("notificationPanel.waitFor({state:'hidden'"),'E2E must verify the overlay actually closed')
 assert.ok(runtime.slice(open,next).includes("notificationPanel.waitFor({state:'visible'"),'E2E must verify the panel opened')
})

test('navigation Sentinel checks localized menu bindings instead of stale Spanish literals',async()=>{
 const [sentinel,menu,header]=await Promise.all([
  read('scripts/client-navigation-sentinel.mjs'),
  read('src/features/client/ui/ClientGlobalMenu.tsx'),
  read('src/features/client/ui/ClientPersistentHeader.tsx'),
 ])
 const keys=['nav.home','client.request','client.categories','client.activity','client.addresses','client.payment','client.notifications','clientMenu.assistant','nav.help','clientMenu.settings','client.logout']
 assert.ok(sentinel.includes('for(const key of menuKeys)'),'Sentinel must validate the localized t(key) bindings')
 assert.ok(!sentinel.includes('menu.includes(token)'),'hard-coded Spanish labels cannot be required in localized JSX')
 for(const key of keys)assert.ok(menu.includes("t('"+key+"')"),'menu action must have translation binding: '+key)
 for(const key of ['clientHeader.openMenu','clientHeader.home'])assert.ok(header.includes("t('"+key+"')"),'header must have translation binding: '+key)
 assert.ok(sentinel.includes('data-client-menu-action="hugo"'),'Sentinel must preserve stable Hugo selector')
 assert.ok(sentinel.includes("flow.navigate('request')"),'Sentinel must preserve request composer navigation')
 assert.ok(sentinel.includes("p.page_errors.length"),'Sentinel must still reject browser errors')
})
