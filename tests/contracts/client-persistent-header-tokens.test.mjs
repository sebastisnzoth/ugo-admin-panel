import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client persistent header consumes global design tokens',async()=>{const css=await read('src/mvp/client/client-persistent-header.css');for(const token of ['--ugo-color-surface','--ugo-color-border','--ugo-color-text','--ugo-color-brand-500','--ugo-radius-md','--ugo-space-3'])assert.ok(css.includes('var('+token),token);assert.doesNotMatch(css,/background:#fff|color:#102335|color:#07966f|border-bottom:1px solid #e5ebe8/)})
