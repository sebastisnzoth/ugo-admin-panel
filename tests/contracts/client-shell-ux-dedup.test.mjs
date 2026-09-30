import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client shell has one visible menu trigger and no hidden duplicate button',async()=>{
 const[menu,header]=await Promise.all([read('src/features/client/ui/ClientGlobalMenu.tsx'),read('src/features/client/ui/ClientPersistentHeader.tsx')])
 assert.doesNotMatch(menu,/className="ugo-client-global-trigger"/)
 assert.match(menu,/addEventListener\(OPEN_CLIENT_MENU_EVENT,openMenu\)/)
 assert.match(header,/dispatchEvent\(new Event\(OPEN_CLIENT_MENU_EVENT\)\)/)
 assert.match(header,/className="ugo-client-header-menu"/)
})

test('client menu sends Hugo to the canonical request surface and logout back to client auth route',async()=>{
 const menu=await read('src/features/client/ui/ClientGlobalMenu.tsx')
 assert.match(menu,/const hugo=\(\)=>\{close\(\);flow\.navigate\('request'\)/)
 assert.doesNotMatch(menu,/const hugo=\(\)=>go\('search'\)/)
 assert.match(menu,/window\.location\.replace/)
 assert.match(menu,/\?app=client/)
 assert.doesNotMatch(menu,/window\.location\.reload\(\)/)
})

test('client menu account card reflects the authenticated profile instead of a hard-coded user',async()=>{
 const menu=await read('src/features/client/ui/ClientGlobalMenu.tsx')
 assert.match(menu,/\{supabase,profile\}=useRoleSession\('client'\)/)
 assert.match(menu,/const displayName=String\(profile\?\.nombre/)
 assert.match(menu,/const initials=useMemo/)
 assert.doesNotMatch(menu,/ugo-client-account-avatar">S</)
})
