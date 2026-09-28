import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929073000_p0_journey_tester_persisted_execution.sql', 'utf8')
const runner = readFileSync('scripts/autonomous-p0-runtime.mjs', 'utf8')

test('P0 journey tester reads persisted demo service state and cannot approve a real customer', () => {
  for (const assertion of ['accepted_offer_within_20km', 'no_offer_outside_20km',
    'arrival_event', 'cash_acknowledged', 'bilateral_rating']) {
    assert.ok(sql.includes(assertion), assertion)
  }
  assert.match(sql, /ambiente='demo'/)
  assert.match(sql, /'physical_gps_verified',false/)
  assert.match(sql, /'uploaded_media_verified',false/)
  assert.match(sql, /'customer_acceptance',false/)
  assert.match(sql, /grant execute on function public\.autonomous_record_p0_journey_test\(uuid\) to service_role/)
})

test('P0 runtime executes the real QA agent and verifies its job and ledgers', () => {
  assert.match(runner, /db\.rpc\('autonomous_record_p0_journey_test'/)
  assert.match(runner, /P0_JOURNEY_TESTER_LEDGER_INCOMPLETE/)
  assert.match(runner, /physical_gps_verified!==false/)
})
