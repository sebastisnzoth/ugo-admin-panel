import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929071000_persisted_qa_judge_agent_execution.sql', 'utf8')
const acl = readFileSync('supabase/migrations/20260929072000_persisted_qa_judge_acl_guard.sql', 'utf8')
const workerGrant = readFileSync('supabase/migrations/20260929074000_qa_judge_worker_read_grant.sql', 'utf8')
const runtime = readFileSync('scripts/autonomous-qa-judge-runtime.mjs', 'utf8')
const workflow = readFileSync('.github/workflows/autonomous-worker-test.yml', 'utf8')

test('judge independently recomputes persisted verdict and rejects invented evidence', () => {
  assert.match(sql, /PERSISTED_TEST_JUDGE_OBSERVATIONS_MISMATCH/)
  assert.match(sql, /PERSISTED_TEST_JUDGE_VERDICT_MISMATCH/)
  assert.match(sql, /ambiente='demo'/)
  assert.match(sql, /count\(distinct autor_tipo\)>=2/)
  assert.match(sql, /distancia_km<=20/)
  assert.match(acl, /revoke insert, update, delete on public\.autonomous_qa_runs from public, anon, authenticated/)
  assert.match(workerGrant, /grant select on public\.autonomous_qa_runs to service_role/)
})

test('judge execution links agent, job, evidence, decision and correlation', () => {
  for (const value of ['judge_agent_id', 'autonomous_jobs', 'autonomous_evidence_ledger',
    'autonomous_decision_ledger', 'correlation_id', 'simulated_service']) {
    assert.ok(sql.includes(value), value)
    assert.ok(runtime.includes(value), value)
  }
  assert.match(workflow, /node scripts\/autonomous-qa-judge-runtime\.mjs/)
})
