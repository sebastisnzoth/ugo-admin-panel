import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const core=fs.readFileSync('.github/workflows/core-ci.yml','utf8')
const isolated=fs.readFileSync('.github/workflows/isolated-rpc-rls.yml','utf8')
const worker=fs.readFileSync('.github/workflows/autonomous-worker-test.yml','utf8')
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'))
const autonomousIntegration=fs.readFileSync('tests/integration/autonomous-corporation-rpc-rls.test.mjs','utf8')

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

test('Core CI validates configured pushes and deduplicates the candidate SHA',()=>{
 assert.doesNotMatch(core,/github\.event\.created == false/)
 assert.match(core,/cancel-in-progress: true/)
})


test('full suite serializes shared UGO TEST integration fixtures',()=>{
 assert.match(pkg.scripts.test,/--test-concurrency=1/)
})


test('autonomous integration recovers only the explicit OFF-mode fixture race before enqueue',()=>{
 assert.match(autonomousIntegration,/result\.error\?\.message\?\.includes\('AUTONOMY_NOT_EXECUTABLE'\)/)
 assert.match(autonomousIntegration,/isolated runtime fixture recovery before enqueue/)
})


test('isolated RPC gate is SHA-deduplicated without timing sleeps',()=>{
 assert.match(isolated,/group: ugo-isolated-rpc-rls-/)
 assert.match(isolated,/cancel-in-progress: true/)
 assert.doesNotMatch(isolated,/sleep 90/)
})
