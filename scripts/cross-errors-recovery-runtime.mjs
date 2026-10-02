import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'

const TEST='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
assert.equal(url,TEST,'UGO_TEST_ONLY')
assert.ok(key,'UGO_TEST_SERVICE_ROLE_REQUIRED')
assert.match(sha,/^[0-9a-f]{40}$/,'VALID_SHA_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const correlationId=randomUUID()

const {data,error}=await db.rpc('autonomous_execute_exception_recovery',{p_correlation_id:correlationId})
if(error)throw error
const modePreserved=data?.final_mode===data?.initial_mode
assert.equal(data?.passed,true,'RECOVERY_NOT_PASSED')
assert.equal(data?.incident_status,'resolved','INCIDENT_NOT_RESOLVED')
assert.equal(data?.job_status,'SUCCEEDED','RECOVERY_JOB_NOT_SUCCEEDED')
assert.equal(modePreserved,true,'AUTONOMY_MODE_NOT_PRESERVED')
assert.equal(data?.kill_switches_preserved,true,'KILL_SWITCH_STATE_NOT_PRESERVED')
assert.equal(data?.production_touched,false,'PRODUCTION_MUST_NOT_BE_TOUCHED')

const {count:running,error:runningError}=await db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING').eq('correlation_id',correlationId)
if(runningError)throw runningError
assert.equal(running,0,'RECOVERY_LEFT_RUNNING_JOB')

const out={
 schema_version:'UGO_READINESS_EVIDENCE_V1',
 readiness_id:'cross-errors-recovery',
 sha,
 environment:'UGO TEST',
 correlation_id:correlationId,
 result:'PASS',
 incident_status:data.incident_status,
 job_status:data.job_status,
 initial_mode:data.initial_mode,
 final_mode:data.final_mode,
 mode_preserved:modePreserved,
 kill_switches_preserved:true,
 running_jobs_after_recovery:0,
 production_touched:false,
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/cross-errors-recovery-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
