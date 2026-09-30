import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const workflow=fs.readFileSync('.github/workflows/cross-performance-runtime.yml','utf8')
const runtime=fs.readFileSync('scripts/cross-performance-runtime.mjs','utf8')

test('cross-performance workflow validates the exact PR head SHA',()=>{
  assert.match(workflow,/UGO_RUNTIME_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
  assert.match(workflow,/ref:\s*\$\{\{ env\.UGO_RUNTIME_SHA \}\}/)
  assert.match(workflow,/VITE_APP_REVISION:\s*\$\{\{ env\.UGO_RUNTIME_SHA \}\}/)
  assert.match(workflow,/name: cross-performance-runtime-\$\{\{ env\.UGO_RUNTIME_SHA \}\}/)
})

test('client performance navigation uses a genuinely pointer-reachable action',()=>{
  assert.match(runtime,/clickFirstPointerReachable/)
  assert.match(runtime,/document\.elementFromPoint/)
  assert.match(runtime,/filter\(\{hasText:\/Pedir servicio\/i\}\)/)
  assert.doesNotMatch(runtime,/force:\s*true/)
})
