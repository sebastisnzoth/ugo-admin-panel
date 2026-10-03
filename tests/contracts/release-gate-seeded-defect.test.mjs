import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20261003004000_release_gate_expected_seeded_defect.sql','utf8')

test('release gate accepts a detected controlled meta-QA defect as expected evidence',()=>{
 assert.match(sql,/scenario\.scenario_key='qa-meta-seeded-defect'/)
 assert.match(sql,/latest\.status='FAILED'/)
 assert.match(sql,/seeded_defect_detected/)
 assert.match(sql,/expected_failure_detected/)
})

test('release gate still fails closed for every other latest FAILED or BLOCKED QA run',()=>{
 assert.match(sql,/latest\.status in\('FAILED','BLOCKED'\)/)
 assert.match(sql,/and not coalesce\(\(latest\.judge_result->>'expected_failure_detected'\)::boolean,false\)/)
})
