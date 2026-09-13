import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=(path)=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')
test('admin preserves last valid metrics instead of converting query failures to zero',async()=>{
 const src=await read('src/mvp/AdminPhase2.tsx')
 assert.match(src,/results\.find\(result=>result\?\.error\)/)
 assert.match(src,/Conservamos los últimos datos válidos/)
 assert.doesNotMatch(src,/setMetrics\(empty\).*catch/s)
})
test('admin exposes retryable degraded state and six mobile destinations',async()=>{
 const src=await read('src/mvp/AdminPhase2.tsx')
 const css=await read('src/mvp/admin-uiux-final.css')
 assert.match(src,/ugo-admin2-metrics-error/)
 assert.match(src,/role="alert"/)
 assert.match(css,/repeat\(6,minmax\(0,1fr\)\)/)
 assert.match(src,/aria-current=/)
 assert.match(src,/aria-selected=/)
})
