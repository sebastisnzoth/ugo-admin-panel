import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:job,error}=await db.rpc('autonomous_reconcile_quality_coverage');if(error)throw error
if(job.status!=='SUCCEEDED'||job.capability!=='qa.coverage_reconcile'||job.verification_result?.passed!==true)throw new Error('QUALITY_COVERAGE_AGENT_NOT_VERIFIED')
const[{count:dc,error:de},{count:ec,error:ee},{data:agent,error:ae},{data:cov,error:ce}]=await Promise.all([
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 db.from('autonomous_agents').select('id,status,authority_class').eq('agent_key','quality-coverage-agent').single(),
 db.from('autonomous_quality_coverage').select('coverage_key,status')])
if(de)throw de;if(ee)throw ee;if(ae)throw ae;if(ce)throw ce
if(dc!==1||ec!==1||agent.status!=='IDLE'||agent.authority_class!=='GREEN')throw new Error('QUALITY_COVERAGE_LEDGER_OR_AGENT_INVALID')
for(const key of ['gps-geofence','roles','permissions-rls','realtime','physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])if(!cov.some(x=>x.coverage_key===key&&x.status==='UNCOVERED'))throw new Error('PROTECTED_COVERAGE_PROMOTED:'+key)
console.log(JSON.stringify({qualityCoverageAgent:true,jobId:job.id,covered:job.verification_result.covered,uncovered:job.verification_result.uncovered,customerAcceptance:false}))
