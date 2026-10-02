import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const readiness=JSON.parse(fs.readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const item=readiness.groups.flatMap(group=>group.items||[]).find(item=>item.id==='end-to-end-command-center-gate')
const lock=JSON.parse(fs.readFileSync('docs/ugo-work-locks/readiness-end-to-end-command-center-gate.json','utf8'))
const evidence=JSON.parse(fs.readFileSync('docs/evidence/readiness-end-to-end-command-center-gate-20261002.json','utf8'))

test('final autonomous Command Center gate remains closed from persisted same-SHA evidence',()=>{
  assert.equal(item?.status,'VERIFIED')
  assert.equal(lock.status,'DONE')
  assert.equal(lock.validators_result?.Judge,'PASS')
  assert.equal(lock.validators_result?.Sentinel,'PASS')
  assert.equal(lock.runtime_validated_sha,evidence.tested_sha)
  assert.equal(evidence.result,'VERIFIED')
  assert.equal(evidence.assertions.autonomous_scope_complete,true)
  assert.equal(evidence.assertions.human_work_preserved,true)
  assert.equal(evidence.assertions.launch_authorized,false)
  assert.equal(evidence.production_touched,false)
})
