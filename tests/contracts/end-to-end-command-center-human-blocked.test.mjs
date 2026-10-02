import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime=fs.readFileSync('scripts/end-to-end-command-center-gate-runtime.mjs','utf8')

test('final Command Center gate does not misclassify descendants blocked only by human evidence',()=>{
  assert.match(runtime,/blockedByHuman/)
  assert.match(runtime,/!blockedByHuman\(item\.id\)/)
  assert.match(runtime,/summary\.remaining_autonomous/)
  assert.match(runtime,/SUMMARY_AUTONOMOUS_CONTROLS_REMAIN/)
})

test('final gate still rejects genuinely autonomous unresolved controls',()=>{
  assert.match(runtime,/AUTONOMOUS_CONTROLS_REMAIN/)
  assert.match(runtime,/INVALID_REMAINING_CONTROLS/)
  assert.match(runtime,/item\.status!==\'VERIFIED\'/)
})
