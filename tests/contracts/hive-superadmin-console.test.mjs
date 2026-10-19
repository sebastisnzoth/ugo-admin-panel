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
 assert.match(consoleCode,/supabase\.functions\.invoke<HiveStatus>\('ugo-hive-status'/)\n assert.doesNotMatch(consoleCode,/supabase\.functions\.invoke[^\n]*(?:chat|completion|inference|model)/i)\n assert.doesNotMatch(consoleCode,/signInWithPassword\(|localStorage|OPENROUTER_API_KEY/)
})
test('Hive multilingual UI copy is present and no fictional metrics are rendered',()=>{
 assert.match(consoleCode,/'pt-BR':/)
 assert.match(consoleCode,/'es':/)
 assert.match(consoleCode,/'en':/)
 assert.doesNotMatch(consoleCode,/Math\.random|setInterval|fakeData|mockMetrics/)
})
