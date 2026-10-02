import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
const mutatingProviderWorkflows=[
 '.github/workflows/provider-gps-runtime.yml',
 '.github/workflows/provider-debt-runtime.yml',
]

test('provider TEST runtimes that mutate the shared provider fixture stay serialized',async()=>{
 for(const path of mutatingProviderWorkflows){
  const source=await read(path)
  assert.match(source,/group:\s*ugo-test-shared-provider-fixture/)
  assert.match(source,/cancel-in-progress:\s*false/)
 }
})

test('provider UI browser proof is read-only and may use its own same-SHA queue',async()=>{
 const [workflow,runtime]=await Promise.all([
  read('.github/workflows/provider-ui-runtime-test.yml'),
  read('scripts/provider-ui-runtime.mjs'),
 ])
 assert.match(workflow,/group:\s*provider-ui-runtime-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/cancel-in-progress:\s*true/)
 assert.doesNotMatch(runtime,/\.from\([^\n]+\)\.(?:insert|update|delete|upsert)\(/)
 assert.doesNotMatch(runtime,/\.rpc\(/)
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
