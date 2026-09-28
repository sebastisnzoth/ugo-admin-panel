import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929075000_meta_qa_agent_persisted_calibration.sql', 'utf8')
const runner = readFileSync('scripts/autonomous-meta-qa-runtime.mjs', 'utf8')

test('Meta-QA gate only accepts a persisted three-run calibration on one demo service', () => {
  for (const marker of ['baseline_run_id', 'seeded_run_id', 'rerun_id',
    'META_QA_SERVICE_BINDING_MISMATCH', 'META_QA_PERSISTED_DEMO_SERVICE_REQUIRED',
    'META_QA_DETECT_REMEDIATE_RERUN_REQUIRED', 'permanent_regression=true']) {
    assert.ok(sql.includes(marker), marker)
  }
  assert.match(sql, /meta_qa_validated=false/)
  assert.match(sql, /PERSISTED_META_QA_CALIBRATION_REQUIRED/)
  assert.match(sql, /grant execute on function public\.autonomous_record_meta_qa_calibration\(uuid,uuid,uuid\)\s+to service_role/)
})

test('scheduled TEST runner executes calibration and verifies agent ledgers', () => {
  assert.match(runner, /db\.rpc\('autonomous_record_meta_qa_calibration'/)
  assert.match(runner, /META_QA_AGENT_LEDGER_INCOMPLETE/)
  assert.match(runner, /customer_acceptance!==false/)
})
