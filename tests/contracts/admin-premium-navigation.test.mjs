import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('admin uses readable button groups instead of incomplete tabs',async()=>{
 const[src,phase,home,finalCss]=await Promise.all([
  read('src/mvp/AdminPhase2.tsx'),
  read('src/mvp/admin-phase2.css'),
  read('src/mvp/admin-home-stitch.css'),
  read('src/mvp/admin-uiux-final.css')
 ])
 assert.doesNotMatch(src,/role="tab"/)
 assert.doesNotMatch(src,/role="tablist"/)
 assert.doesNotMatch(src,/aria-selected=/)
 assert.match(src,/role="group" aria-label="Menú de operaciones"/)
 assert.match(src,/aria-pressed=\{operationView===/)
 assert.match(phase,/font-size:var\(--ugo-font-caption\)/)
 assert.doesNotMatch(phase,/font-size:8px/)
 assert.match(phase,/\.ugo-admin2-submenu button\{[^}]*min-height:var\(--ugo-touch-target\)/s)
 assert.match(home,/\.ahs-service-row\{[^}]*font-size:var\(--ugo-font-caption\)/s)
 assert.doesNotMatch(finalCss,/font-size:7px/)
})
