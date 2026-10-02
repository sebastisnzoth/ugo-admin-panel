import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
const workflows=[
 '.github/workflows/provider-gps-runtime.yml',
 '.github/workflows/provider-debt-runtime.yml',
 '.github/workflows/provider-ui-runtime-test.yml',
]

test('provider TEST runtimes serialize on the canonical shared provider fixture',async()=>{
 for(const path of workflows){
  const source=await read(path)
  assert.match(source,/group:\s*ugo-test-shared-provider-fixture/)
  assert.match(source,/cancel-in-progress:\s*false/)
 }
})

test('provider-mutating autonomous integration stays serialized on the shared fixture',async()=>{
 const sources=await Promise.all([
  read('.github/workflows/autonomous-worker-test.yml'),
  read('.github/workflows/isolated-rpc-rls.yml'),
 ])
 for(const source of sources)assert.match(source,/group:\s*ugo-test-shared-provider-fixture/)
})

test('scheduled autonomous proof has an independent same-SHA concurrency queue',async()=>{
 const source=await read('.github/workflows/scheduled-worker-proof-test.yml')
 assert.match(source,/group:\s*ugo-test-scheduled-worker-proof-/)
 assert.match(source,/github\.event\.workflow_run\.head_sha \|\| github\.sha/)
 assert.match(source,/cancel-in-progress:\s*false/)
 assert.doesNotMatch(source,/group:\s*ugo-test-shared-provider-fixture/)
})
