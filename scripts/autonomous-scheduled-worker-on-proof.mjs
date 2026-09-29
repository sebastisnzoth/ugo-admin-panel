import assert from'node:assert/strict'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=String(process.env.GITHUB_SHA||'').trim()
const runId=String(process.env.GITHUB_RUN_ID||'local').trim()
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
if(!/^[0-9a-f]{40}$/.test(sha))throw new Error('VALID_GITHUB_SHA_REQUIRED')
if(!runId)throw new Error('RUN_ID_REQUIRED')

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await db.rpc('autonomous_run_scheduled_worker_proof',{p_source_sha:sha,p_run_id:runId})
if(error)throw error
assert.equal(data?.scheduledWorkerOnProof,true)
assert.equal(data?.sourceSha,sha)
assert.equal(data?.status,'SUCCEEDED')
assert.equal(data?.verificationPassed,true)
assert.equal(data?.finalMode,'OFF')
assert.ok(data?.jobId)
assert.ok(data?.correlationId)
assert.ok(Number(data?.decisionLedger)>=1)
assert.ok(Number(data?.evidenceLedger)>=1)

const{data:safe,error:safeError}=await db.from('autonomous_company_state').select('mode').eq('singleton',true).single()
if(safeError)throw safeError
assert.equal(safe.mode,'OFF')
const{count:running,error:runningError}=await db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING')
if(runningError)throw runningError
assert.equal(running,0)

console.log(JSON.stringify(data))
