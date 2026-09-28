import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929081000_qa_physical_evidence_coverage.sql', 'utf8')
const releaseGate = readFileSync('supabase/migrations/20260929063000_autonomous_release_gate_alias_fix.sql', 'utf8')

test('physical GPS, uploaded evidence bytes and human acceptance start uncovered', () => {
  for (const key of ['physical-gps-device', 'uploaded-media-bytes', 'real-customer-acceptance']) {
    assert.ok(sql.includes(`'${key}'`), key)
  }
  assert.equal((sql.match(/'UNCOVERED'/g) || []).length, 3)
  assert.match(sql, /physical GPS, image bytes and real customer excluded/)
})

test('Launch Gate blocks uncovered requirements from persisted coverage', () => {
  assert.match(releaseGate, /autonomous_quality_coverage/)
  assert.match(releaseGate, /status<>'COVERED'/)
  assert.match(releaseGate, /QA_COVERAGE_INCOMPLETE/)
})
