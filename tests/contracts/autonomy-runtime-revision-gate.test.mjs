import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('runtime revision records the whole workflow outcome',async()=>{
 const src=await read('scripts/autonomous-runtime-revision.mjs')
 assert.match(src,/UGO_RUNTIME_SHA\|\|process\.env\.GITHUB_SHA/)
 assert.match(src,/UGO_RUNTIME_JOB_STATUS/)
 assert.match(src,/workflow_passed:jobStatus==='success'/)
 assert.match(src,/job_status:jobStatus/)
})

test('scheduled proof passes job.status into persisted runtime evidence',async()=>{
 const yml=await read('.github/workflows/scheduled-worker-proof-test.yml')
 assert.match(yml,/UGO_RUNTIME_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/)
 assert.match(yml,/UGO_RUNTIME_JOB_STATUS: \$\{\{ job\.status \}\}/)
})

test('AUTONOMY_ON readiness requires a recent full scheduled proof PASS',async()=>{
 const sql=await read('supabase/migrations/20261002131500_autonomy_readiness_requires_workflow_pass.sql')
 assert.match(sql,/verification->>'worker'/)
 assert.match(sql,/verification->>'workflow_passed'/)
 assert.match(sql,/RECENT_SCHEDULED_WORKER_PROOF_REQUIRED/)
})


test('scheduled worker proof consumes the explicit runtime SHA before GITHUB_SHA',async()=>{
 const src=await read('scripts/autonomous-scheduled-worker-on-proof.mjs')
 assert.match(src,/UGO_RUNTIME_SHA\|\|process\.env\.GITHUB_SHA/)
})
