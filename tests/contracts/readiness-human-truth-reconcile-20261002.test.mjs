import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const readiness=JSON.parse(fs.readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const items=readiness.groups.flatMap(group=>group.items||[])
const byId=new Map(items.map(item=>[item.id,item]))

test('human-required lifecycle and Hugo controls are not counted as autonomous verified work',()=>{
  for(const id of ['client-provider-lifecycle','hugo-real-runtime-proof']){
    const item=byId.get(id)
    assert.ok(item,id)
    assert.equal(item.status,'HUMAN_FINAL',id)
    assert.equal(item.real_test_required,true,id)
    assert.equal(item.reconciled_from_persisted_lock,true,id)
    const lock=JSON.parse(fs.readFileSync('docs/ugo-work-locks/readiness-'+id+'.json','utf8'))
    assert.equal(lock.status,'HUMAN_REQUIRED',id)
    assert.equal(lock.human_final_required?.required,true,id)
  }
})
