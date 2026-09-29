import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const sql=fs.readFileSync('supabase/migrations/20260929164500_autonomous_control_integrity_verifier.sql','utf8')

test('D14 integrity controls derive status from persisted facts and cannot be caller-certified',()=>{
 for(const key of ['audit-evidence','authority-boundaries','data-quality-gate','job-resilience']) assert.match(sql,new RegExp(key))
 assert.match(sql,/not exists\(select 1 from public\.autonomous_jobs where status in\('QUEUED','RUNNING','WAITING_APPROVAL'\) and agent_id is null\)/)
 assert.match(sql,/evidence_hash is null/)
 assert.match(sql,/lease_expires_at<now\(\)/)
 assert.match(sql,/data_quality_status<>'TRUSTED'/)
 assert.match(sql,/revoke all on function public\.autonomous_verify_integrity_controls\(\) from public,anon,authenticated/)
 assert.match(sql,/grant execute on function public\.autonomous_verify_integrity_controls\(\) to service_role/)
})


test('Autonomous Worker fails closed unless all integrity controls verify EFFECTIVE',()=>{
 const runtime=fs.readFileSync('scripts/autonomous-control-integrity-runtime.mjs','utf8')
 const workflow=fs.readFileSync('.github/workflows/autonomous-worker-test.yml','utf8')
 assert.match(runtime,/assert\.equal\(controls\.get\(k\),'EFFECTIVE'/)
 assert.match(workflow,/node scripts\/autonomous-control-integrity-runtime\.mjs/)
})
