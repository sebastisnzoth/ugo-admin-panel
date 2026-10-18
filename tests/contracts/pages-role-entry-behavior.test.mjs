import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
const html=await fs.readFile(new URL('../../pages/index.html',import.meta.url),'utf8')
function route(url){let redirected=null;const script=html.match(/<script id="ugo-role-entry">([\s\S]*?)<\/script>/)?.[1]||'';vm.runInNewContext(script,{URL,window:{location:{href:url,replace:value=>{redirected=value}}}});return redirected}
for(const app of ['client','provider','admin','superadmin','development'])test('Pages root opens the real '+app+' application',()=>{assert.equal(route('https://example.com/ugo-admin-panel/?app='+app),'https://example.com/ugo-admin-panel/app/?app='+app)})
test('Pages root preserves auth callback parameters and fragment',()=>{assert.equal(route('https://example.com/ugo-admin-panel/?app=admin&code=abc&section=superadmin#recovery'),'https://example.com/ugo-admin-panel/app/?app=admin&code=abc&section=superadmin#recovery')})
test('Pages observatory and unknown routes do not redirect',()=>{assert.equal(route('https://example.com/ugo-admin-panel/'),null);assert.equal(route('https://example.com/ugo-admin-panel/?app=unknown'),null)})
