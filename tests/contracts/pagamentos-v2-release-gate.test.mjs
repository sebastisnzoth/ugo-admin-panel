import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('Pix PASS cannot become a commercial Release Candidate while financial and operational gates remain open', () => {
  const run = spawnSync(process.execPath, ['scripts/ugo-payment-release-gate.mjs'], { encoding: 'utf8' })
  assert.equal(run.status, 1)
  assert.match(run.stderr, /UGO RELEASE CANDIDATE — BLOCKED/)
  for (const gate of ['splitReal8515', 'operationalAuthRealtimeRls', 'backupRestore', 'productionAuthorization', 'realServiceAndCommission']) {
    assert.ok(run.stderr.includes(gate), gate)
  }
  assert.doesNotMatch(run.stderr, /"previewCodeRollback"/)
  assert.doesNotMatch(run.stderr + run.stdout, /api[_-]?key|access_token|password|cpfCnpj/i)
})
