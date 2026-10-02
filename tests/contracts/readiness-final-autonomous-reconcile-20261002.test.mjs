import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const readiness=JSON.parse(fs.readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const items=readiness.groups.flatMap(group=>group.items||[])
const byId=new Map(items.map(item=>[item.id,item]))

test('final autonomous Command Center gate is reconciled only from persisted verified evidence',()=>{
  const item=byId.get('end-to-end-command-center-gate')
  assert.ok(item)
  assert.equal(item.status,'VERIFIED')
  assert.equal(item.evidence_path,'docs/evidence/readiness-end-to-end-command-center-gate-20261002.json')
  assert.equal(item.reconciled_from_persisted_evidence,true)

  const lock=JSON.parse(fs.readFileSync('docs/ugo-work-locks/readiness-end-to-end-command-center-gate.json','utf8'))
  assert.equal(lock.status,'DONE')
  assert.equal(lock.current_step,'VERIFIED')
  assert.equal(lock.validators_result?.Judge,'PASS')
  assert.equal(lock.validators_result?.Sentinel,'PASS')
  assert.equal(lock.production_touched,false)
  assert.ok(fs.existsSync(item.evidence_path))
})

test('Hugo real runtime proof is not counted as autonomous once only physical microphone/audio evidence remains',()=>{
  const item=byId.get('hugo-real-runtime-proof')
  assert.ok(item)
  assert.equal(item.status,'HUMAN_FINAL')
  assert.equal(item.reconciled_from_persisted_evidence,true)
  assert.equal(item.automated_scope,'VERIFIED')

  const lock=JSON.parse(fs.readFileSync('docs/ugo-work-locks/readiness-hugo-real-runtime-proof.json','utf8'))
  assert.equal(lock.status,'HUMAN_REQUIRED')
  assert.equal(lock.automated_scope?.result,'PASS')
  assert.equal(lock.human_final_required?.required,true)
  assert.equal(lock.production_touched,false)
})

test('no autonomous NEEDS_RUNTIME_PROOF controls remain in the static catalog',()=>{
  assert.deepEqual(items.filter(item=>item.status==='NEEDS_RUNTIME_PROOF').map(item=>item.id),[])
})
