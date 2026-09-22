import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider desktop sidebar consumes canonical provider visual tokens',async()=>{const css=await read('src/mvp/provider/provider-studio-sidebar.css');for(const token of ['--provider-surface','--provider-border','--provider-text','--provider-text-muted','--provider-accent'])assert.ok(css.includes('var('+token),token);assert.doesNotMatch(css,/background:#006b58;/);assert.doesNotMatch(css,/border-right:1px solid #dce9ff;/)})
