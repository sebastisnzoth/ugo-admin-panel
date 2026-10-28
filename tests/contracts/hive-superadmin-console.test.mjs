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
test('Hive Super Admin chat invokes existing TEST-only job queue and shows real worker status',()=>{
 assert.ok(consoleCode.includes("supabase.functions.invoke<HiveStatus>('ugo-hive-status'"))
 assert.match(consoleCode,/ugo-hive-local-jobs/)
 assert.match(consoleCode,/action:'create'/)
 assert.match(consoleCode,/action:'list'/)
 assert.match(consoleCode,/action:'worker_status'/)
 assert.ok(consoleCode.includes('idempotency_key:crypto.randomUUID()'))
 assert.match(consoleCode,/workerOffline/)
 assert.match(consoleCode,/worker\?\.connected\?tr\.workerOnline:tr\.workerOffline/)
 assert.ok(!consoleCode.includes('signInWithPassword('));assert.ok(!consoleCode.includes('localStorage'));assert.ok(!consoleCode.includes('OPENROUTER_API_KEY'))
})
test('Hive multilingual UI copy is present and no fictional metrics are rendered',()=>{
 assert.match(consoleCode,/'pt-BR':/)
 assert.match(consoleCode,/'es':/)
 assert.match(consoleCode,/'en':/)
 assert.doesNotMatch(consoleCode,/Math\.random|setInterval|fakeData|mockMetrics/)
})