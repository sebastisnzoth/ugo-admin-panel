import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=String(process.env.GITHUB_SHA||'').trim(),ref=String(process.env.GITHUB_REF||'').trim(),runId=String(process.env.GITHUB_RUN_ID||'').trim(),attempt=Number(process.env.GITHUB_RUN_ATTEMPT||1)
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
if(!/^[0-9a-f]{40}$/.test(sha))throw new Error('VALID_GITHUB_SHA_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await db.rpc('autonomous_record_runtime_revision',{
 p_workflow:'UGO Autonomous Worker TEST',p_source_sha:sha,p_source_ref:ref,p_run_id:runId,p_run_attempt:attempt,
 p_verification:{worker:true,environment:'UGO_TEST',recorded_at:new Date().toISOString()}
})
if(error)throw error
if(data?.source_sha!==sha||data?.environment!=='UGO_TEST')throw new Error('RUNTIME_REVISION_NOT_PERSISTED')
console.log(JSON.stringify({runtimeRevision:true,sourceSha:sha,workflow:data.workflow,environment:data.environment}))
