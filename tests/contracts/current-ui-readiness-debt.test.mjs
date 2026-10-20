import './i18n-test-compat.mjs'
import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin map controls expose accessible names',async()=>{
 const map=await read('src/components/MapaOperativo.tsx')
 for(const key of['searchLabel','radiusLabel','goToSearch','refresh','filterLabel','autoRefresh'])assert.match(map,new RegExp(`translate\\('adminMap\\.${key}'\\)`))
})

test('Admin live status metadata keeps readable contrast',async()=>{
 const css=await read('src/mvp/admin-home-stitch.css')
 assert.match(css,/\.ahs-live-dot\{[^}]*color:#2f3d34/)
 assert.match(css,/\.ahs-live-dot small\{[^}]*color:#56645b/)
})

test('Provider role runtime follows canonical current sidebar labels',async()=>{
 const[runtime,providerRuntime,sidebar]=await Promise.all([read('scripts/role-ui-runtime.mjs'),read('scripts/provider-ui-runtime.mjs'),read('src/mvp/provider/ProviderStudioSidebar.tsx')])
 assert.match(runtime,/\/Pedidos\/i/)
 assert.match(runtime,/Trabajo activo\|Mis trabajos/)
 assert.doesNotMatch(runtime,/\/Trabajos\/i,\/Calendario\/i/)
 assert.match(providerRuntime,/getByTestId\('auth-form'\)/)
 assert.match(providerRuntime,/refreshAndVerify\(page\)/)
 assert.match(providerRuntime,/\.provider-operational-dock/)
 assert.match(providerRuntime,/\.provider-signout/)
 assert.doesNotMatch(providerRuntime,/ugo-test-provider-auth|localStorage\.setItem/)
 assert.doesNotMatch(providerRuntime,/\['Inicio','Trabajos','Calendario'/)
 assert.match(sidebar,/t\('nav\.orders'\)/)
 assert.match(sidebar,/d\.service\?t\('nav\.active'\):t\('nav\.jobs'\)/)
})
