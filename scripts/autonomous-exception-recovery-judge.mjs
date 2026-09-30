import { createClient } from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const correlationId=process.env.UGO_EXCEPTION_RECOVERY_CORRELATION_ID||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key||!correlationId)throw new Error('UGO_EXCEPTION_RECOVERY_JUDGE_INPUT_REQUIRED')

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {data,error}=await db.rpc('autonomous_judge_exception_recovery',{p_correlation_id:correlationId})
if(error)throw error
if(
  data?.judge!=='PASS'
  ||data?.sentinel!=='PASS'
  ||data?.killSwitchesPreserved!==true
  ||data?.runningJobs!==0
  ||data?.productionTouched!==false
)throw new Error('EXCEPTION_RECOVERY_JUDGE_FAILED')

console.log(JSON.stringify(data))
