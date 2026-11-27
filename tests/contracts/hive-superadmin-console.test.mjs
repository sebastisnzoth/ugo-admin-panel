import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const root='src/mvp/'
const consoleCode=fs.readFileSync(root+'HiveConsole.tsx','utf8')
const gate=fs.readFileSync(root+'AdminGate.tsx','utf8')
const shell=fs.readFileSync(root+'AdminPhase2.tsx','utf8')
test('Hive navigation is Super Admin only and auth gate enforces this section',()=>{
 assert.match(gate,/requestedSection==='hive'/)
 assert.match(gate,/profile\.tipo==='superadmin'/)
 assert.match(shell,/isSuperAdmin&&<button[^\n]+section==='hive'/)
 assert.match(shell,/section==='hive'&&isSuperAdmin/)
})
test('Hive offline chat never submits prompts or invokes providers',()=>{
 assert.match(consoleCode,/disabled rows=\{3\}/)
 assert.match(consoleCode,/<button type="button" disabled>/)
 assert.match(consoleCode,/supabase\.functions\.invoke<HiveStatus>\('ugo-hive-status'/)
 assert.doesNotMatch(consoleCode,/supabase\.functions\.invoke[^\n]*(?:chat|completion|inference|model)/i)
 assert.doesNotMatch(consoleCode,/signInWithPassword\(|localStorage|OPENROUTER_API_KEY/)
})
test('Hive multilingual UI copy is present and no fictional metrics are rendered',()=>{
 assert.match(consoleCode,/'pt-BR':/)
 assert.match(consoleCode,/'es':/)
 assert.match(consoleCode,/'en':/)
 assert.doesNotMatch(consoleCode,/Math\.random|setInterval|fakeData|mockMetrics/)
})
test('Hive status call is bounded and never polled',()=>{
 assert.match(consoleCode,/new AbortController\(\)/)
 assert.match(consoleCode,/signal:controller\.signal/)
 assert.match(consoleCode,/clearTimeout\(timer\)/)
 assert.doesNotMatch(consoleCode,/setInterval|requestAnimationFrame/)
})
test('console renders the canonical 13 departments from a single provenance-tagged catalog',()=>{
 const catalog=fs.readFileSync(root+'hiveCatalog.ts','utf8')
 const departments=[...catalog.matchAll(/\{ id: (\d+), key: '[a-z]+', name: '[^']+', agents: (\d+), focus: '[^']+' \}/g)].map(m=>({id:Number(m[1]),agents:Number(m[2])}))
 assert.equal(departments.length,13)
 assert.deepEqual(departments.map(d=>d.id),[1,2,3,4,5,6,7,8,9,10,11,12,14])
 assert.equal(departments.reduce((total,d)=>total+d.agents,0),118)
 assert.match(catalog,/source: 'docs\/UGO_HIVE_MASTER_DISENO_2026-10-18\.md'/)
 assert.match(catalog,/capturedAt: '2026-10-18'/)
 assert.match(consoleCode,/HIVE_CATALOG\.departments\.map/)
 assert.match(consoleCode,/executionUnverified/)
 // The UI must not carry its own department counts: the catalog is the only source.
 assert.doesNotMatch(consoleCode,/agents:\s*\d+/)
})
