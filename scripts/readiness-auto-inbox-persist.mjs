import { readFile, writeFile, mkdir } from 'node:fs/promises'

const runtime=JSON.parse(await readFile('artifacts/readiness-auto-inbox/runtime.json','utf8'))
const judge=JSON.parse(await readFile('artifacts/readiness-auto-inbox/judge.json','utf8'))
const sentinel=JSON.parse(await readFile('artifacts/readiness-auto-inbox/sentinel.json','utf8'))
const lockPath='docs/ugo-work-locks/readiness-auto-inbox.json'
const evidencePath='docs/evidence/readiness-auto-inbox-20260930.json'
const readinessPath='docs/UGO_FUNCTIONAL_READINESS.json'
const lock=JSON.parse(await readFile(lockPath,'utf8'))

const fail=m=>{throw new Error('PERSIST_FAIL:'+m)}
if(runtime.readiness_id!=='auto-inbox'||lock.readiness_id!=='auto-inbox')fail('identity')
if(judge.verdict!=='PASS'||sentinel.verdict!=='PASS')fail('validators')
if(judge.runtime_sha!==runtime.runtime_sha||sentinel.runtime_sha!==runtime.runtime_sha)fail('same_sha')
if(lock.status!=='IN_PROGRESS')fail('lock_not_in_progress')
if(lock.correlation_id!==runtime.correlation_id)fail('correlation')

const completedAt=new Date().toISOString()
const runId=process.env.GITHUB_RUN_ID||null
const evidence={
 schema_version:'UGO_READINESS_AUTO_INBOX_EVIDENCE_V1',
 readiness_id:'auto-inbox',
 task_id:'readiness-auto-inbox',
 job_id:'UGO-READINESS-AUTO-INBOX',
 correlation_id:runtime.correlation_id,
 environment:'UGO TEST',
 tested_sha:runtime.runtime_sha,
 workflow_run_id:runId?Number(runId):null,
 workflow_name:'UGO Readiness Auto Inbox TEST',
 workflow_result:'PASS',
 runtime,
 validators:{Judge:judge,Sentinel:sentinel},
 control_result:'VERIFIED',
 production_touched:false,
 persisted_at:completedAt
}
await mkdir('docs/evidence',{recursive:true})
await writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n')

const readiness=JSON.parse(await readFile(readinessPath,'utf8'))
let readinessUpdated=false
for(const group of readiness.groups||[])for(const item of group.items||[])if(item.id==='auto-inbox'){
 item.status='VERIFIED'
 readinessUpdated=true
}
if(!readinessUpdated)fail('readiness_control_not_found')
await writeFile(readinessPath,JSON.stringify(readiness,null,2)+'\n')

lock.status='DONE'
lock.current_step='VERIFIED'
lock.heartbeat_at=completedAt
lock.lease_expires_at=completedAt
lock.completed_at=completedAt
lock.finished_at=completedAt
lock.verified_sha=runtime.runtime_sha
lock.runtime_validated_sha=runtime.runtime_sha
lock.result='VERIFIED'
lock.validators_result={Judge:'PASS',Sentinel:'PASS'}
lock.validator_results={Judge:judge,Sentinel:sentinel}
lock.evidence_path=evidencePath
lock.production_touched=false
lock.evidence_ids=[...(lock.evidence_ids||[]),...(runId?['github-actions:run:'+runId]:[]),'repo:'+evidencePath,'judge-pass:'+runtime.runtime_sha.slice(0,8),'sentinel-pass:'+runtime.runtime_sha.slice(0,8)]
lock.result_summary='UGO TEST verified Executive Inbox ordering by authority/SLA, correlation deduplication, audited approval/rejection, duplicate-decision blocking, safe fixture cleanup, Judge PASS and Sentinel PASS on the same SHA. Production untouched.'
await writeFile(lockPath,JSON.stringify(lock,null,2)+'\n')
console.log(JSON.stringify({evidencePath,lockPath,verified_sha:runtime.runtime_sha,run_id:runId}))
