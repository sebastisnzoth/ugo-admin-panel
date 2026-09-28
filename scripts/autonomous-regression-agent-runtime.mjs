import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:job,error}=await db.rpc('autonomous_reconcile_regressions');if(error)throw error
if(job.status!=='SUCCEEDED'||job.capability!=='qa.regression_reconcile'||job.verification_result?.source!=='PERSISTED_QA_STATE')throw new Error('REGRESSION_AGENT_NOT_VERIFIED')
if(job.verification_result?.passed!==true||Number(job.verification_result?.regressions_detected)!==0)throw new Error('PERMANENT_REGRESSION_DETECTED')
const[{count:dc,error:de},{count:ec,error:ee},{data:agent,error:ae}]=await Promise.all([
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 db.from('autonomous_agents').select('id,status,authority_class').eq('agent_key','regression-agent').single()])
if(de)throw de;if(ee)throw ee;if(ae)throw ae
if(dc!==1||ec!==1||agent.status!=='IDLE'||agent.authority_class!=='GREEN')throw new Error('REGRESSION_LEDGER_OR_AGENT_INVALID')
console.log(JSON.stringify({regressionAgent:true,jobId:job.id,verified:job.verification_result.verified,regressionsDetected:0}))
