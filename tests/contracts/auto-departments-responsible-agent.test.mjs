import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime=fs.readFileSync('scripts/autonomous-departments-readiness-runtime.mjs','utf8')

test('department readiness prefers a non-advisory responsible agent',()=>{
 assert.match(runtime,/a\.permissions\.includes\('advisory_only'\)/)
 assert.match(runtime,/b\.permissions\.includes\('advisory_only'\)/)
 assert.match(runtime,/return aAdvisory-bAdvisory/)
})

test('department readiness does not weaken advisory mutation guard semantics',()=>{
 assert.match(runtime,/trigger_type:'READINESS_RUNTIME'/)
 assert.doesNotMatch(runtime,/AUTHORIZED_ADVISORY_EXECUTOR/)
 assert.doesNotMatch(runtime,/advisory\.readonly\./)
})
