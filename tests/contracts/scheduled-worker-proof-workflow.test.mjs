import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('scheduled worker proof is browser-independent, same-SHA and fail-closed',async()=>{
 const yml=await readFile(new URL('../../.github/workflows/scheduled-worker-proof-test.yml',import.meta.url),'utf8')
 assert.match(yml,/schedule:\s*[\s\S]*cron:/)
 assert.match(yml,/workflow_run:\s*[\s\S]*UGO Core CI/)
 assert.match(yml,/github\.event\.workflow_run\.head_sha \|\| github\.sha/)
 assert.match(yml,/autonomous-scheduled-worker-on-proof\.mjs/)
 assert.match(yml,/autonomous-sentinel-gate\.mjs/)
 assert.match(yml,/UGO Scheduled Worker Proof TEST/)
 assert.match(yml,/ugo-test-scheduled-worker-proof-/)
 assert.doesNotMatch(yml,/group: ugo-test-shared-provider-fixture/)
})

test('scheduled proof cadence leaves refresh margin inside the 45 minute readiness window',async()=>{
 const yml=await readFile(new URL('../../.github/workflows/scheduled-worker-proof-test.yml',import.meta.url),'utf8')
 const cron=yml.match(/cron: '([^']+)'/)?.[1].split(/\s+/)
 assert.ok(cron)
 assert.deepEqual(cron.slice(1),['*','*','*','*'])
 const minutes=cron[0].split(',').map(Number).sort((a,b)=>a-b)
 const gaps=minutes.map((m,i)=>(minutes[(i+1)%minutes.length]+(i===minutes.length-1?60:0))-m)
 assert.ok(Math.max(...gaps)<=15,'an hourly proof expires for at least 15 minutes before its next scheduled run')
})
