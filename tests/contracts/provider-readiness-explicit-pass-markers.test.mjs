import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('provider readiness aggregates explicit successful completion markers',async()=>{
 const yml=await readFile('.github/workflows/provider-readiness-batch.yml','utf8')
 const ids=['responsive','gps','gps_judge','gps_sentinel','arrival_judge','arrival_sentinel','debt','debt_judge','debt_sentinel']
 for(const id of ids){
  assert.match(yml,new RegExp('steps\\.'+id+'\\.outputs\\.passed'))
 }
 assert.equal((yml.match(/echo "passed=true" >> "\$GITHUB_OUTPUT"/g)||[]).length,9)
 assert.doesNotMatch(yml,/steps\.(responsive|gps|gps_judge|gps_sentinel|arrival_judge|arrival_sentinel|debt|debt_judge|debt_sentinel)\.outcome/)
})
