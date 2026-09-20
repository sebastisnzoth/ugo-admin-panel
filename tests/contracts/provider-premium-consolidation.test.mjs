import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider derives visual aliases from UGO and preserves future work',async()=>{
 const[css,home]=await Promise.all([
  read('src/mvp/provider/provider-redesign-2026.css'),
  read('src/mvp/provider/ProviderHome.tsx')
 ])
 assert.match(css,/--pro-ink:var\(--ugo-color-on-surface\)/)
 assert.match(css,/--pro-green:var\(--ugo-color-primary\)/)
 assert.match(css,/--pro-cyan:var\(--ugo-color-secondary-container\)/)
 assert.match(css,/--pro-danger:var\(--ugo-color-error\)/)
 assert.doesNotMatch(css,/--pro-green:#|--pro-cyan:#|--pro-danger:#/)
 assert.match(home,/d\.service&&d\.opportunities\.length>0/)
 assert.match(home,/Podés aceptar otro/)
 assert.match(home,/flow\.actions\.openAgenda/)
})
