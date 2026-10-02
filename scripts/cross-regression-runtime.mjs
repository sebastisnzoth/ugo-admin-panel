import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{spawnSync}from'node:child_process'

const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
assert.match(sha,/^[0-9a-f]{40}$/)

const tests=[
 'tests/contracts/provider-offer-dispatch-1404-regression.test.mjs',
 'tests/contracts/client-retry-location-dispatch.test.mjs',
 'tests/contracts/matching-null-deadline-recovery.test.mjs',
 'tests/contracts/notification-retirement-indexes.test.mjs',
 'tests/contracts/scheduled-worker-proof-workflow.test.mjs',
 'tests/contracts/client-provider-lifecycle.test.mjs',
 'tests/contracts/provider-history-detail.test.mjs',
 'tests/contracts/client-payment-recovery.test.mjs',
 'tests/contracts/client-realtime-reconnect.test.mjs',
 'tests/contracts/provider-offer-alert-lifecycle.test.mjs'
]
for(const file of tests)await fs.access(file)
const run=spawnSync(process.execPath,['--test','--test-concurrency=1',...tests],{encoding:'utf8',env:process.env,maxBuffer:8*1024*1024})
if(run.status!==0){
 console.error(run.stdout)
 console.error(run.stderr)
 throw new Error('CROSS_REGRESSION_SUITE_FAILED')
}
const passMatch=run.stdout.match(/# pass (\d+)/)
const failMatch=run.stdout.match(/# fail (\d+)/)
const pass=Number(passMatch?.[1]||0),fail=Number(failMatch?.[1]||0)
assert.ok(pass>=tests.length)
assert.equal(fail,0)

const sourceChecks=[
 ['src/features/client/services/clientActionService.ts',/pickupFallback:'stored'/],
 ['supabase/migrations/20261002115500_matching_requires_service_location.sql',/Falta una ubicación válida para buscar profesionales/],
 ['supabase/migrations/20261002121500_notification_retirement_indexes.sql',/notificaciones_servicio_pending_lifecycle_idx/],
 ['supabase/migrations/20261002140000_scheduled_worker_proof_queue_isolation.sql',/pg_advisory_xact_lock/],
 ['src/features/client/request/ClientPostConfirmFlow.tsx',/Reintentar pedido/],
 ['src/lib/dispatch/supabaseDispatch.ts',/recoverAcceptedDispatch/]
]
for(const[file,pattern]of sourceChecks){
 const source=await fs.readFile(file,'utf8')
 assert.match(source,pattern,file)
}
const out={
 readiness_id:'cross-regression',
 sha,
 environment:'UGO TEST / repository same-SHA',
 production_touched:false,
 result:'PASS',
 regression_files:tests,
 regression_file_count:tests.length,
 passing_tests:pass,
 failing_tests:fail,
 source_guard_count:sourceChecks.length,
 critical_incidents:[
  'provider-offer-dispatch-1404',
  'legacy-null-location-retry',
  'matching-null-deadline',
  'notification-retirement-timeout',
  'scheduled-worker-queue-isolation',
  'client-provider-lifecycle',
  'provider-history',
  'payment-recovery',
  'realtime-reconnect',
  'provider-offer-alert-lifecycle'
 ],
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/cross-regression-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
