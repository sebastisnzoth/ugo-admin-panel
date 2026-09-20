import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=async p=>readFile(new URL('../../'+p,import.meta.url),'utf8').catch(()=>'')

test('premium contract and tokens exist',async()=>{
 const[ux,css]=await Promise.all([read('UX-CONTRACT.md'),read('src/mvp/ugo-design-system.css')])
 assert.match(ux,/UGO — UX Contract/)
 assert.match(ux,/WCAG 2\.2 AA/)
 assert.match(ux,/48 px/)
 assert.match(ux,/Mapa degradado/)
 assert.match(ux,/DEMO · DATOS FICTICIOS/)
 for(const x of['--ugo-font-caption:12px','--ugo-font-body:14px','--ugo-font-title:16px','--ugo-scrollbar-thumb:'])assert.ok(css.includes(x),x)
 assert.match(css,/scrollbar-color:var\(--ugo-scrollbar-thumb\)/)
})


test('legacy CSS debt is frozen behind an evidence-based retirement gate',async()=>{
 const ledger=await read('docs/UGO_CSS_MIGRATION_LEDGER.md')
 assert.match(ledger,/client-ai-studio-final-lock\.css/)
 assert.match(ledger,/client-real-test-fixes\.css/)
 assert.match(ledger,/Retiro sólo con evidencia de consumidor cero/)
})
