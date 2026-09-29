import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await db.rpc('autonomous_execute_corporate_challenges')
if(error)throw error
for(const key of ['META_AUDIT','RED_TEAM','DIGITAL_TWIN']){
 if(data?.[key]?.status!=='PASSED'||data?.[key]?.result?.passed!==true)throw new Error('CORPORATE_CHALLENGE_NOT_PASSED:'+key)
}
if(data?.FOUNDER_CHALLENGE?.status!=='PLANNED')throw new Error('FOUNDER_CHALLENGE_MUST_REMAIN_HUMAN')
console.log(JSON.stringify({corporateChallenges:true,metaAudit:'PASSED',redTeam:'PASSED',digitalTwin:'PASSED',founderChallenge:'PLANNED'}))
