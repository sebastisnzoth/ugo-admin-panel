import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const core=fs.readFileSync('.github/workflows/core-ci.yml','utf8')
const isolated=fs.readFileSync('.github/workflows/isolated-rpc-rls.yml','utf8')
const worker=fs.readFileSync('.github/workflows/autonomous-worker-test.yml','utf8')

test('UGO TEST mutating gates are chained instead of competing for one pending concurrency slot',()=>{
 assert.match(core,/group: ugo-core-ci-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(isolated,/workflows: \["UGO Core CI"\]/)
 assert.match(isolated,/github\.event\.workflow_run\.head_sha/)
 assert.match(isolated,/head_branch == 'main'/)
 assert.match(worker,/workflows: \["UGO Isolated RPC RLS"\]/)
 assert.match(worker,/github\.event\.workflow_run\.head_sha/)
 assert.match(worker,/head_branch == 'main'/)
 assert.doesNotMatch(isolated,/group: ugo-test-runtime-/)
 assert.doesNotMatch(worker,/group: ugo-test-runtime-/)
})


test('Core CI skips the synthetic push emitted when a technical branch is created',()=>{
 assert.match(core,/github\.event_name != 'push' \|\| github\.event\.created == false/)\n assert.match(core,/cancel-in-progress: true/)
})
