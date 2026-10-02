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
