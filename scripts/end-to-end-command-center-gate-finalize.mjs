import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const runtime=JSON.parse(await fs.readFile('artifacts/end-to-end-command-center-gate-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/end-to-end-command-center-gate-judge.json','utf8'))
const sentinel=JSON.parse(await fs.readFile('artifacts/end-to-end-command-center-gate-sentinel.json','utf8'))

assert.equal(runtime.result,'PASS')
assert.equal(judge.judge,'PASS')
assert.equal(sentinel.sentinel,'PASS')
assert.equal(runtime.sha,judge.sha)
assert.equal(runtime.sha,sentinel.sha)
assert.equal(runtime.autonomous_scope_complete,true)
assert.equal(runtime.launch_authorized,false)
assert.equal(runtime.production_touched,false)

const now=new Date().toISOString()
const runId=String(process.env.GITHUB_RUN_ID||'').trim()
const runAttempt=String(process.env.GITHUB_RUN_ATTEMPT||'').trim()
const evidencePath='docs/evidence/readiness-end-to-end-command-center-gate-20261002.json'
const lockPath='docs/ugo-work-locks/readiness-end-to-end-command-center-gate.json'

const evidence={
  schema_version:'UGO_READINESS_EVIDENCE_V1',
  readiness_id:'end-to-end-command-center-gate',
  status:'VERIFIED',
  environment:runtime.environment,
  tested_sha:runtime.sha,
  workflow_run_id:runId||null,
  workflow_run_attempt:runAttempt||null,
  result:{
    runtime:'PASS',
    judge:'PASS',
    sentinel:'PASS',
    autonomous_scope_complete:true,
    launch_authorized:false,
    production_touched:false,
  },
  totals:runtime.totals,
  human_required_ids:runtime.human_required_ids,
  critical_verified_ids:runtime.critical_verified_ids,
  command_center_truthful:true,
  verified_at:now,
}
await fs.mkdir('docs/evidence',{recursive:true})
await fs.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n')

const lock=JSON.parse(await fs.readFile(lockPath,'utf8'))
lock.status='DONE'
lock.heartbeat_at=now
lock.lease_expires_at=now
lock.completed_at=now
lock.finished_at=now
lock.current_step='VERIFIED'
lock.verified_sha=runtime.sha
lock.runtime_validated_sha=runtime.sha
lock.result='VERIFIED'
lock.validators_result={Judge:'PASS',Sentinel:'PASS'}
lock.validator_results={Judge:'PASS',Sentinel:'PASS'}
lock.evidence_path=evidencePath
lock.production_touched=false
lock.blocker=null
lock.evidence_ids=[
  ...(Array.isArray(lock.evidence_ids)?lock.evidence_ids:[]),
  'github-actions:run:'+runId,
  'same-sha:'+runtime.sha,
  'repo-evidence:'+evidencePath,
  'runtime:PASS',
  'judge:PASS',
  'sentinel:PASS',
]
lock.result_summary='Final autonomous Command Center gate VERIFIED: every non-human control is closed, remaining work is explicitly human/physical only, Runtime/Judge/Sentinel PASS on the same SHA, and production remains untouched.'
await fs.writeFile(lockPath,JSON.stringify(lock,null,2)+'\n')

console.log(JSON.stringify({status:'VERIFIED',tested_sha:runtime.sha,evidence_path:evidencePath,lock_path:lockPath}))
