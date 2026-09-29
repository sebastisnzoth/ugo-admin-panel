import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const workflows=['.github/workflows/core-ci.yml','.github/workflows/isolated-rpc-rls.yml','.github/workflows/autonomous-worker-test.yml']

test('all UGO TEST mutating workflows share one non-cancelling runtime lock',()=>{
 for(const file of workflows){
  const yml=fs.readFileSync(file,'utf8')
  assert.match(yml,/group: ugo-test-runtime-\$\{\{ github\.head_ref \|\| github\.ref_name \}\}/,file)
  assert.match(yml,/cancel-in-progress: false/,file)
 }
})
