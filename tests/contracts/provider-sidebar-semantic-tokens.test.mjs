import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider sidebar status and payment accents use semantic tokens',async()=>{const[tokens,css]=await Promise.all([read('src/mvp/provider/provider-design-tokens.css'),read('src/mvp/provider/provider-studio-sidebar.css')]);assert.match(tokens,/--provider-danger:var\(--ugo-color-danger\)/);assert.match(tokens,/--provider-on-accent:#fff/);assert.match(css,/background:var\(--provider-danger,#ef4444\)/);assert.match(css,/color:var\(--provider-on-accent,#fff\)/);assert.doesNotMatch(css,/background:#ef4444;/)})
