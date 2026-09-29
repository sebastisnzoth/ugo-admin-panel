import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const evidence = JSON.parse(await fs.readFile('artifacts/admin-realtime-runtime.json', 'utf8'))

assert.equal(evidence.environment, 'UGO TEST')
assert.ok(String(evidence.tested_url).includes('127.0.0.1:4173'))
assert.equal(evidence.production_touched, false)
assert.equal(evidence.reconciliation?.restored, true)
assert.equal(evidence.refresh?.manual_refresh_used, false)
assert.ok(['admin', 'superadmin'].includes(evidence.actor_role))

const verdict = {
  validator: 'Sentinel',
  readiness_id: 'admin-realtime',
  sha: evidence.sha,
  result: 'PASS',
  production_touched: false,
  reconciliation: 'PASS',
  checked_at: new Date().toISOString(),
}

await fs.writeFile('artifacts/admin-realtime-sentinel.json', JSON.stringify(verdict, null, 2) + '\n')
console.log(JSON.stringify(verdict))
