import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-navigation-runtime.json','utf8'))
const menu=await fs.readFile('src/features/client/ui/ClientGlobalMenu.tsx','utf8')
const header=await fs.readFile('src/features/client/ui/ClientPersistentHeader.tsx','utf8')
const nav=await fs.readFile('src/features/client/navigation/useClientRootNavigation.ts','utf8')
// The menu and header render localized t(key) values. The E2E already verifies
// the actual Spanish/Portuguese/English labels and real user interactions;
// static checks must validate translation bindings, not obsolete JSX literals.
const menuKeys=['nav.home','client.request','client.categories','client.activity','client.addresses','client.payment','client.notifications','clientMenu.assistant','nav.help','clientMenu.settings','client.logout']
for(const key of menuKeys)assert.ok(menu.includes("t('"+key+"')"),'localized menu binding missing: '+key)
for(const key of ['clientHeader.openMenu','clientHeader.home'])assert.ok(header.includes("t('"+key+"')"),'localized header binding missing: '+key)
assert.ok(menu.includes('data-client-menu-action="hugo"'),'stable Hugo action missing')
assert.ok(menu.includes("flow.navigate('request')"),'request composer navigation missing')
for(const token of ['openService','closeService','goHome','openNotice'])assert.ok(nav.includes(token),'root navigation contract missing: '+token)
assert.equal(p.sha,sha)
const counts=new Map();for(const entry of p.click_map)counts.set(entry.control,(counts.get(entry.control)||0)+1);assert.ok([...counts.values()].every(count=>count<=2),'unexpected duplicate click-map entry beyond desktop/mobile coverage')
assert.ok(p.views.every(v=>typeof v.label==='string'&&v.label.length>0&&typeof v.screen==='string'&&v.screen.includes('ugo-client-root')),'invalid runtime view inventory')
assert.equal(p.page_errors.length,0)
const out={validator:'Sentinel',result:'PASS',sha,readiness_id:p.readiness_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-navigation-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
