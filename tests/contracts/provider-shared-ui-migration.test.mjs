import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider home starts consuming the shared UI foundation without changing business actions',async()=>{
 const home=await read('src/mvp/provider/ProviderHome.tsx')
 assert.match(home,/from'\.\.\/\.\.\/shared\/ui'/)
 assert.match(home,/SectionHeader/)
 assert.match(home,/StatusPill/)
 assert.match(home,/Button variant="primary"/)
 assert.match(home,/d\.toggleOnline/)
 assert.match(home,/flow\.actions\.openOpportunities/)
 assert.match(home,/flow\.actions\.openAgenda/)
 assert.match(home,/flow\.actions\.openEarnings/)
 assert.match(home,/Efectivo \{money\(d\.cashReceived\)\}/)
 assert.match(home,/Debés UGO \{money\(d\.ugoDebt\)\}/)
})

test('provider visual aliases resolve to the global design tokens',async()=>{
 const[root,css]=await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'),read('src/mvp/provider/provider-design-tokens.css')])
 assert.match(root,/provider-design-tokens\.css/)
 assert.match(css,/--provider-accent:var\(--ugo-color-brand-500\)/)
 assert.match(css,/--provider-surface:var\(--ugo-color-surface\)/)
 assert.match(css,/--provider-radius:var\(--ugo-radius-lg\)/)
 assert.match(css,/--provider-shadow:var\(--ugo-shadow-sm\)/)
})
