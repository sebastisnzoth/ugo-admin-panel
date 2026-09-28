import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:validation,error}=await db.rpc('autonomous_validate_specialist',{p_agent_key:'regression-agent'});if(error)throw error
if(validation?.status!=='DISABLED'||validation?.validation_only!==true)throw new Error('REGRESSION_VALIDATION_GUARD_INVALID')
if(validation?.authority_class!=='GREEN')throw new Error('REGRESSION_AUTHORITY_INVALID')
console.log(JSON.stringify({regressionAgent:true,validationOnly:true,status:validation.status,authorityClass:validation.authority_class,executionAllowed:false}))
