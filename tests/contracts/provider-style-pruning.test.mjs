import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider style entrypoint drops redundant nav cleanup layer',async()=>{const[styles,responsive]=await Promise.all([read('src/features/provider/providerStyles.ts'),read('src/mvp/provider/provider-responsive-layout.css')]);assert.doesNotMatch(styles,/provider-nav-cleanup\.css/);assert.match(responsive,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)})
