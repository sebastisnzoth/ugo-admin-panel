import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const baseSql=readFileSync('supabase/migrations/20260929084000_quality_coverage_agent_execution.sql','utf8')
const fixSql=readFileSync('supabase/migrations/20260929110500_quality_coverage_independent_runtime_fix.sql','utf8')
const d14Sql=readFileSync('supabase/migrations/20260929133000_d14_quality_coverage_semantic_audit.sql','utf8')
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

test('runtime requires semantic ledgers and preserves physical\/human gates',()=>{
  assert.match(runtime,/decision','QUALITY_COVERAGE_RECONCILED/)
  assert.match(runtime,/evidence_type','QA_COVERAGE_RECONCILIATION/)
  assert.match(runtime,/\(dc\?\?0\)<1\|\|\(ec\?\?0\)<1/)
  assert.match(runtime,/INDEPENDENT_COVERAGE_NOT_PROMOTED/)
  assert.match(runtime,/PHYSICAL_OR_HUMAN_COVERAGE_PROMOTED/)
})

test('D14 audit validates semantic proof and only protects physical or human coverage',()=>{
  assert.match(d14Sql,/decision='QUALITY_COVERAGE_RECONCILED'/)
  assert.match(d14Sql,/evidence_type='QA_COVERAGE_RECONCILIATION'/)
  assert.match(d14Sql,/semantic_decisions<1 or semantic_evidence<1/)
  for(const k of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])assert.ok(d14Sql.includes(k))
  assert.doesNotMatch(d14Sql,/coverage_key in\(\s*'gps-geofence'/)
})
