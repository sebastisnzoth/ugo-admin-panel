import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider desktop sidebar exposes one identity avatar and one availability control',async()=>{const[tsx,css]=await Promise.all([read('src/mvp/provider/ProviderStudioSidebar.tsx'),read('src/mvp/provider/provider-studio-sidebar.css')]);assert.match(tsx,/className="provider-studio-avatar"/);assert.doesNotMatch(tsx,/StatusPill/);assert.match(tsx,/provider-studio-availability/);assert.match(css,/\.provider-studio-avatar\{/);assert.doesNotMatch(css,/\.provider-studio-user>span\{/);})
