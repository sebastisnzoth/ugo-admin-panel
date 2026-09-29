import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929082000_external_qa_observations_fail_closed.sql', 'utf8')
const runtime = readFileSync('scripts/autonomous-qa-runtime.mjs', 'utf8')

test('authenticated probe booleans remain observations without independent proof', () => {
  assert.match(sql, /CALLER_OBSERVATIONS_NOT_AUTHORITATIVE/)
  assert.match(sql, /values\(scenario\.id,'BLOCKED'/)
  assert.match(sql, /status='UNCOVERED'/)
  for (const key of ['gps-geofence', 'roles', 'permissions-rls', 'realtime']) {
    assert.ok(sql.includes(`'${key}'`), key)
  }
  assert.doesNotMatch(sql, /p_observations->>.*\)::boolean/)
})

test('worker asserts only persisted judges yield COVERED', () => {
  assert.match(runtime, /const bad=persisted\.filter/)
  assert.match(runtime, /QA_INDEPENDENT_JUDGE_REQUIRED/)
  assert.match(runtime, /QA_INDEPENDENT_LEDGER_REQUIRED/)
  assert.doesNotMatch(runtime, /p_observations.*COVERED/)
})
