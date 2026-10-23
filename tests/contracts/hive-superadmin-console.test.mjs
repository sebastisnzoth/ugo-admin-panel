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
test('Hive chat queues authenticated TEST inference with bounded fields and no client-side provider credentials',()=>{
 assert.match(consoleCode,/supabase\\.functions\\.invoke<HiveStatus>\\('ugo-hive-status'/)
 assert.match(consoleCode,/supabase\\.functions\\.invoke\\('ugo-hive-local-jobs'/)
 assert.match(consoleCode,/action:'create',prompt:value,idempotency_key:id/)
 assert.match(consoleCode,/action:'list'/)
 assert.match(consoleCode,/action:'worker_status'/)
 assert.match(consoleCode,/crypto\\.randomUUID\\(\\)/)
 assert.match(consoleCode,/disabled=\\{!chatVerified\\|\\|sending\\|\\|!prompt\\.trim\\(\\)\\}/)
 assert.doesNotMatch(consoleCode,/signInWithPassword\\(|localStorage|OPENROUTER_API_KEY|FREEAPI_API_KEY/)
})
test('Hive multilingual UI copy is present and no fictional metrics are rendered',()=>{
 assert.match(consoleCode,/'pt-BR':/)
 assert.match(consoleCode,/'es':/)
 assert.match(consoleCode,/'en':/)
 assert.match(consoleCode,/setInterval\(\(\)=>void refresh\(\),5000\)/)
 assert.doesNotMatch(consoleCode,/Math\.random|fakeData|mockMetrics/)
})
