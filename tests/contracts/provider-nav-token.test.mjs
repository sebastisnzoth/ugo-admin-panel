import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider mobile nav columns are expressed through provider design tokens',async()=>{const[tokens,responsive,styles]=await Promise.all([read('src/mvp/provider/provider-design-tokens.css'),read('src/mvp/provider/provider-responsive-layout.css'),read('src/features/provider/providerStyles.ts')]);assert.match(tokens,/--provider-nav-columns:repeat\(4,minmax\(0,1fr\)\)/);assert.match(responsive,/grid-template-columns:var\(--provider-nav-columns\)/);assert.doesNotMatch(styles,/provider-nav-cleanup\.css/)})
