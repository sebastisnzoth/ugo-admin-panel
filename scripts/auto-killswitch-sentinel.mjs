import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'SENTINEL_INPUTS_REQUIRED')

const runtime=JSON.parse(await fs.readFile('artifacts/auto-killswitch-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/auto-killswitch-judge.json','utf8'))
const failures=[]
const check=(ok,label)=>{if(!ok)failures.push(label)}
check(judge.result==='PASS','JUDGE_PASS_REQUIRED')
check(runtime.sha===sha,'SAME_SHA_REQUIRED')
check(runtime.production_touched===false,'PRODUCTION_UNTOUCHED')

const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await db.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session,'SENTINEL_ADMIN_SESSION_REQUIRED')

const [{data:sw,error:switchError},{data:company,error:companyError}]=await Promise.all([
  db.from('autonomous_kill_switches').select('enabled,reason').eq('scope_type','AGENT').eq('scope_key',runtime.target.agent_id).single(),
  db.from('autonomous_company_state').select('mode').eq('singleton',true).single()
])
assert.ifError(switchError);assert.ifError(companyError)
check(sw?.enabled===false,'NO_LINGERING_KILL_SWITCH')
check(runtime.mode?.changed===false,'RUNTIME_GLOBAL_MODE_UNCHANGED')

const {data:jobs,error:jobsError}=await db.from('autonomous_jobs').select('id,status').eq('idempotency_key',runtime.stop.idempotency_key)
assert.ifError(jobsError)
check((jobs?.length||0)===0,'NO_BLOCKED_FIXTURE_JOB')

const result=failures.length?'FAIL':'PASS'
const evidence={
  readiness_id:'auto-killswitch',
  validator:'Sentinel',
  result,
  runtime_sha:sha,
  production_touched:false,
  reconciliation:{
    kill_switch_disabled:sw?.enabled===false,
    runtime_global_mode_unchanged:runtime.mode?.changed===false,
    observed_global_mode:company?.mode||null,
    blocked_fixture_absent:(jobs?.length||0)===0
  },
  failures,
  created_at:new Date().toISOString()
}
await fs.writeFile('artifacts/auto-killswitch-sentinel.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
await db.auth.signOut()
assert.equal(result,'PASS','AUTO_KILLSWITCH_SENTINEL_FAILED: '+failures.join(','))
