import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const evidence = JSON.parse(await fs.readFile('artifacts/admin-realtime-runtime.json', 'utf8'))

assert.equal(evidence.environment, 'UGO TEST')
assert.equal(evidence.result, 'PASS')
assert.equal(evidence.ui?.live_indicator, 'PASS')
assert.equal(evidence.realtime?.beat_fallback, true)
assert.equal(evidence.refresh?.manual_refresh_used, false)
assert.equal(evidence.refresh?.top_level_navigations, 1)
assert.equal(evidence.reconciliation?.restored, true)
assert.equal(evidence.production_touched, false)
assert.deepEqual(evidence.page_errors, [])

const verdict = {
  validator: 'Judge',
  readiness_id: 'admin-realtime',
  sha: evidence.sha,
  result: 'PASS',
  basis: [
    'runtime KPI changed without refresh',
    'change observed before polling fallback',
    'fixture reconciled',
  ],
  checked_at: new Date().toISOString(),
}

await fs.writeFile('artifacts/admin-realtime-judge.json', JSON.stringify(verdict, null, 2) + '\n')
console.log(JSON.stringify(verdict))
