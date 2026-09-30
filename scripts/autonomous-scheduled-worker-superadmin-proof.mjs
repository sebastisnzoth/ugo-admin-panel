import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const service=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const sha=String(process.env.GITHUB_SHA||'').trim()
const runId=String(process.env.GITHUB_RUN_ID||'local').trim()
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co')
assert.ok(anon&&service&&email&&password)
assert.match(sha,/^[0-9a-f]{40}$/)

const actor=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const audit=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await actor.auth.signInWithPassword({email,password})
assert.ifError(loginError);assert.ok(login.user)
const {data:profile,error:profileError}=await audit.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError);assert.equal(profile.tipo,'superadmin');assert.equal(profile.activo,true)

const {data,error}=await actor.rpc('superadmin_run_scheduled_worker_proof',{p_source_sha:sha,p_run_id:runId})
assert.ifError(error)
assert.equal(data?.scheduledWorkerOnProof,true)
assert.equal(data?.sourceSha,sha)
assert.equal(data?.status,'SUCCEEDED')
assert.equal(data?.verificationPassed,true)
assert.equal(data?.finalMode,data?.initialMode)
assert.ok((data?.decisionLedger||0)>=1)
assert.ok((data?.evidenceLedger||0)>=1)

const {data:state,error:stateError}=await audit.from('autonomous_company_state').select('mode').eq('singleton',true).single()
assert.ifError(stateError);assert.equal(state.mode,data?.initialMode)
const {count:running,error:runningError}=await audit.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING')
assert.ifError(runningError);assert.equal(running,0)
await actor.auth.signOut()
console.log(JSON.stringify(data))
