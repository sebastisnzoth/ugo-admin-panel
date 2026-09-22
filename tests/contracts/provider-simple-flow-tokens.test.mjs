import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider simple flow consumes canonical provider surface tokens',async()=>{const css=await read('src/mvp/provider/provider-simple-flow.css');assert.match(css,/background:var\(--provider-surface,#fff\)/);assert.match(css,/box-shadow:var\(--provider-shadow\)/);assert.match(css,/border:1px solid var\(--provider-border\)/);assert.doesNotMatch(css,/var\(--provider-card,#fff\)/)})
