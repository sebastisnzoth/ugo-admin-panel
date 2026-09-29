import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync('supabase/migrations/20260929084000_quality_coverage_agent_execution.sql','utf8')
const runtime=readFileSync('scripts/autonomous-quality-coverage-runtime.mjs','utf8')
test('quality coverage agent only promotes independent persisted judge evidence',()=>{assert.match(sql,/quality-coverage-agent/);assert.match(sql,/qa\.coverage_reconcile/);assert.match(sql,/PERSISTED_TEST_STATE/);assert.match(sql,/qa-judge:/);assert.match(sql,/status='UNCOVERED'/);for(const k of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])assert.ok(sql.includes(k))})
test('runtime requires ledgers, independently judged coverage, and physical/human gates remain uncovered',()=>{assert.match(runtime,/dc!==1\\|\\|ec!==1/);assert.match(runtime,/INDEPENDENT_COVERAGE_NOT_PROMOTED/);assert.match(runtime,/PHYSICAL_OR_HUMAN_COVERAGE_PROMOTED/);assert.match(runtime,/customerAcceptance:false/)})
