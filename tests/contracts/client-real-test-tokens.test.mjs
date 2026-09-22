import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client real-test fixes reuse exact global spacing and surface tokens',async()=>{const css=await read('src/mvp/client/client-real-test-fixes.css');for(const token of ['--ugo-space-6','--ugo-space-3','--ugo-space-2','--ugo-color-surface','--ugo-color-text-muted'])assert.ok(css.includes('var('+token+')'),token);assert.doesNotMatch(css,/background:#fff|color:#667085/);assert.match(css,/calc\(100vw - var\(--ugo-space-6\)\)/)})
