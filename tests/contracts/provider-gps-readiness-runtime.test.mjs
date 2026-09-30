import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const workflow=fs.readFileSync('.github/workflows/provider-gps-runtime.yml','utf8')
const runtime=fs.readFileSync('scripts/autonomous-qa-gps-runtime.mjs','utf8')

test('provider GPS readiness workflow has independent same-SHA Judge and Sentinel',()=>{
  assert.match(workflow,/\n\s*judge:\n/)
  assert.match(workflow,/needs:\s*gps-runtime/)
  assert.match(workflow,/provider-gps-runtime-\$\{\{ github\.sha \}\}/)
  assert.match(workflow,/provider-gps-judge-\$\{\{ github\.sha \}\}/)
  assert.match(workflow,/\n\s*sentinel:\n/)
  assert.match(workflow,/needs:\s*judge/)
  assert.match(workflow,/provider-gps-sentinel-\$\{\{ github\.sha \}\}/)
})

test('provider GPS runtime evidence is bound to the exact candidate SHA',()=>{
  assert.match(runtime,/UGO_RUNTIME_SHA/)
  assert.match(runtime,/sha[,}]/)
  assert.match(runtime,/environment:'UGO TEST'/)
  assert.match(runtime,/productionTouched:false/)
})

test('provider GPS runtime relies on the canonical persisted independent judge only',()=>{
  assert.doesNotMatch(runtime,/SERVICE_ROLE_ISOLATED_TEST_RUNTIME/)
  assert.doesNotMatch(runtime,/autonomous_record_external_qa_probe/)
  assert.doesNotMatch(runtime,/autonomous_record_independent_qa_evidence/)
  assert.match(runtime,/autonomous_qa_run_gps_independent_evidence/)
  assert.match(runtime,/verification_result/)
  assert.match(runtime,/qa_run_id/)
})
