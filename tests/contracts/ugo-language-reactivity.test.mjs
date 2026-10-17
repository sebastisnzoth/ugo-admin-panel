import test from 'node:test'
import assert from 'node:assert/strict'
import{readFile}from'node:fs/promises'
const locale=await readFile(new URL('../../src/i18n/locale.tsx',import.meta.url),'utf8')
const home=await readFile(new URL('../../src/features/client/home/ClientHomeScreen.tsx',import.meta.url),'utf8')
const provider=await readFile(new URL('../../src/mvp/provider/ProviderHome.tsx',import.meta.url),'utf8')
const menu=await readFile(new URL('../../src/features/client/ui/ClientGlobalMenu.tsx',import.meta.url),'utf8')
const notices=await readFile(new URL('../../src/mvp/NotificationCenter.tsx',import.meta.url),'utf8')
test('account language persisted separately and race-safe',()=>{
 assert.match(locale,/accountLocaleKey\(role\|\|'unknown',session\.user\.id\)/)
 assert.match(locale,/revision\.current===startedRevision/)
 assert.match(locale,/isLocale\(local\)\?local:isLocale\(metadata\)/)
 assert.match(locale,/preferred_language:next/)
})
test('client and provider Home use live locale context',()=>{
 assert.match(home,/useLocale\(\)/)
 assert.match(home,/t\('home\.question'\)/)
 assert.match(provider,/t\('provider\.welcome'\)/)
 assert.match(menu,/t\('client\.request'\)/)
})
test('notifications translate supported event headings and local timestamps',()=>{
 assert.match(notices,/titleFor\(liveNotice\)/)
 assert.match(notices,/titleFor\(n\)/)
 assert.match(notices,/toLocaleString\(locale\)/)
})
test('all translated Home and navigation keys exist for all locales',()=>{
 const keys=['home.question','home.request','home.live','provider.welcome','provider.available','nav.home','nav.profile','client.request','notification.proveedor_en_camino']
 for(const key of keys){
  const escaped=key.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')
  const hits=[...locale.matchAll(new RegExp('"'+escaped+'"\\s*:', 'g'))]
  assert.ok(hits.length>=3,key+' incomplete across locales')
 }
})
