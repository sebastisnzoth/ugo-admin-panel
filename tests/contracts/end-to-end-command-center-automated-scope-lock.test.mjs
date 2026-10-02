import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime=fs.readFileSync('scripts/end-to-end-command-center-gate-runtime.mjs','utf8')

test('final gate accepts automated PASS retained under a HUMAN_REQUIRED final lock',()=>{
  assert.match(runtime,/automatedScopeVerified/)
  assert.match(runtime,/lock\.status==='HUMAN_REQUIRED'/)
  assert.match(runtime,/automated_closure\?\.runtime==='PASS'/)
  assert.match(runtime,/automated_closure\?\.judge==='PASS'/)
  assert.match(runtime,/automated_closure\?\.sentinel==='PASS'/)
  assert.match(runtime,/human_final_required\?\.required===true/)
})

test('final gate still requires persisted evidence for every critical control',()=>{
  assert.match(runtime,/CRITICAL_EVIDENCE_MISSING/)
  assert.match(runtime,/doneVerified\|\|automatedScopeVerified/)
})
