import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260929143000_qa_independent_runtime_evidence_judge.sql','utf8')

test('independent runtime coverage requires persisted evidence and deterministic judge',()=>{
 assert.match(migration,/autonomous_qa_assertion_evidence/)
 assert.match(migration,/evidence_hash/)
 assert.match(migration,/INDEPENDENT_EVIDENCE_INCOMPLETE/)
 assert.match(migration,/qa-independent:/)
 assert.match(migration,/INDEPENDENT_PERSISTED_EVIDENCE/)
})

test('physical and human coverage remains fail closed',()=>{
 for(const key of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance']){
  assert.match(migration,new RegExp(key))
 }
 assert.match(migration,/coverage_key=any\(protected\).*status<>'UNCOVERED'/s)
})

test('independent coverage cannot be promoted by external observation alone',()=>{
 assert.match(migration,/exists\(select 1 from public\.autonomous_jobs aj/)
 assert.match(migration,/aj\.verification_result->>'source'='INDEPENDENT_PERSISTED_EVIDENCE'/)
 assert.doesNotMatch(migration,/p_observations/)
})

test('test environment is enforced by persisted service binding',()=>{
 assert.match(migration,/ambiente='demo'/)
 assert.match(migration,/UGO_TEST_SERVICE_REQUIRED/)
})
