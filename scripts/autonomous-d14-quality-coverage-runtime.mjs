import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await db.rpc('autonomous_d14_audit_quality_coverage_agent');if(error)throw error
if(data?.control_key!=='qa-release-gate'||data?.status!=='EFFECTIVE'||!data?.last_verified_at)throw new Error('D14_QUALITY_COVERAGE_AUDIT_FAILED')
const{data:inspect,error:ie}=await db.from('autonomous_agents').select('agent_key,status,last_action_at').eq('agent_key','internal-control-inspector').single();if(ie)throw ie
if(inspect.status!=='IDLE'||!inspect.last_action_at)throw new Error('D14_INSPECTOR_RUNTIME_MISSING')
console.log(JSON.stringify({d14Audit:true,control:data.control_key,status:data.status,auditor:inspect.agent_key}))
