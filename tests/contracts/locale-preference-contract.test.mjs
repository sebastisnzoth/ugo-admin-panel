import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const locale=fs.readFileSync('src/i18n/locale.tsx','utf8')
const app=fs.readFileSync('src/mvp/MvpApp.tsx','utf8')

test('UGO locale preference supports Brazilian Portuguese, Spanish and English with pt-BR default',()=>{
 assert.match(locale,/type UgoLocale='pt-BR'\|'es'\|'en'/)
 assert.match(locale,/return'pt-BR'/)
 assert.match(locale,/language\.portuguese/)
 assert.match(locale,/language\.spanish/)
 assert.match(locale,/language\.english/)
})

test('UGO locale preference persists locally and in authenticated user metadata',()=>{
 assert.match(locale,/localStorage\.setItem\(key\|\|guestLocaleKey\(\),next\)/)
 assert.match(locale,/accountLocaleKey\(role\|\|'unknown',session\.user\.id\)/)
 assert.match(locale,/preferred_language:next/)
 assert.match(locale,/user_metadata\?\.preferred_language/)
})

test('UGO language selector is mounted for every application route through the root app',()=>{
 assert.match(app,/LocaleProvider/)
 assert.match(app,/<LocaleProvider><AppErrorBoundary><EnvironmentBadge\/><MvpAppRoutes\s*\/><\/AppErrorBoundary><\/LocaleProvider>/)
})

test('client global menu has translated accessible labels for every supported locale',()=>{
 const menu=fs.readFileSync('src/features/client/ui/ClientGlobalMenu.tsx','utf8')
 for(const key of ['clientMenu.assistant','clientMenu.settings','clientMenu.close','clientMenu.customer','clientMenu.accountDefault','clientMenu.tagline']){
  assert.ok(menu.includes("t('"+key+"')"),key+' must remain used by the menu')
  const count=locale.split('"'+key+'"').length-1
  assert.equal(count,3,key+' must have pt-BR, es and en translations')
 }
 const runtime=fs.readFileSync('scripts/client-navigation-runtime.mjs','utf8')
 for(const [action,label] of [['Actividad y pedidos','Actividad'],['Formas de pago','Medios de pago'],['Servicios y categorías','Categorías']]){
  assert.ok(runtime.includes("'"+action+"':'"+label+"'"),action+' must target visible translated text')
 }
 assert.ok(runtime.includes("filter({has:drawer.getByText(visibleLabel,{exact:true})})"))
 assert.ok(runtime.includes('await button.click()'),'runtime must use Playwright user click, not DOM bypass')
})
