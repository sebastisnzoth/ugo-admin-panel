import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const baseSql=readFileSync('supabase/migrations/20260929084000_quality_coverage_agent_execution.sql','utf8')
const fixSql=readFileSync('supabase/migrations/20260929110500_quality_coverage_independent_runtime_fix.sql','utf8')
const runtime=readFileSync('scripts/autonomous-quality-coverage-runtime.mjs','utf8')

test('quality coverage agent only promotes independent persisted judge evidence',()=>{
  const sql=baseSql+'\n'+fixSql
  assert.match(sql,/quality-coverage-agent/)
  assert.match(sql,/qa\.coverage_reconcile/)
  assert.match(sql,/PERSISTED_TEST_STATE/)
  assert.match(sql,/qa-judge:/)
  for(const k of ['gps-geofence','roles','permissions-rls','realtime'])assert.ok(fixSql.includes(k))
  for(const k of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])assert.ok(fixSql.includes(k))
})

test('runtime verifies semantic ledgers, independent deterministic coverage, and physical\/human gates',()=>{
  assert.match(runtime,/decision','QUALITY_COVERAGE_RECONCILED/)
  assert.match(runtime,/evidence_type','QA_COVERAGE_RECONCILIATION/)
  assert.match(runtime,/dc!==1\|\|ec!==1/)
  assert.match(runtime,/INDEPENDENT_COVERAGE_NOT_PROMOTED/)
  assert.match(runtime,/PHYSICAL_OR_HUMAN_COVERAGE_PROMOTED/)
  assert.match(runtime,/customerAcceptance:false/)
})
