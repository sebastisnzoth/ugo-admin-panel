import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')
function whiteTextContrast(hex){
 const rgb=[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255)
 const linear=x=>x<=0.04045?x/12.92:((x+.055)/1.055)**2.4
 const luminance=rgb.reduce((a,x,i)=>a+[.2126,.7152,.0722][i]*linear(x),0)
 return 1.05/(luminance+.05)
}
test('Provider UI test locates four visible mobile navigation buttons regardless of spoken names',async()=>{
 const [root,script]=await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'),read('scripts/provider-ui-runtime.mjs')])
 for(const id of ['provider-mobile-home','provider-mobile-orders','provider-mobile-work','provider-mobile-profile']){
  assert.ok(root.includes('data-testid="'+id+'"'),id+' missing in provider UI')
  assert.ok(script.includes(id),id+' missing from runtime')
 }
 assert.doesNotMatch(script,/\['Inicio','Pedidos','Trabajo','Perfil'\]/)
 assert.match(script,/\.waitFor\(\{state:'visible',timeout:10000\}\)/)
})
test('Admin login WCAG AA colors make white text readable on accent and black kicker',async()=>{
 const [login,auth]=await Promise.all([read('src/mvp/ugo-login-v3.css'),read('src/mvp/ugo-auth-redesign.css')])
 const accent=login.match(/\.mvp-auth-page\.ugo-admin-auth\{\s*--ugo-login-accent:(#[a-f\d]{6});/)?.[1]
 assert.ok(accent)
 assert.ok(whiteTextContrast(accent)>=4.5,'Insufficient white-on-accent contrast')
 assert.match(auth,/\.ugo-admin-login-kicker\{color:#fff!important;background:#000!important\}/)
})
test('Cross visual runtime serves real TEST Admin APIs instead of polling an unavailable port',async()=>{
 const [workflow,server]=await Promise.all([read('.github/workflows/cross-visual-runtime.yml'),read('scripts/admin-api-runtime-server.mjs')])
 assert.match(workflow,/node scripts\/admin-api-runtime-server\.mjs/)
 assert.match(workflow,/curl -fsS --retry 10 --retry-connrefused --retry-delay 1 http:\/\/127\.0\.0\.1:4174\/__health/)
 assert.match(workflow,/export VITE_API_BASE_URL="http:\/\/127\.0\.0\.1:4174"/)
 assert.match(workflow,/kill "\$vite_pid" "\$api_pid"/)
 assert.match(server,/assert\.equal\(process\.env\.UGO_TEST_SUPABASE_URL,'https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co','UGO_TEST_ONLY'\)/)
 assert.match(server,/api\/operations/)
})
