import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:job,error}=await db.rpc('autonomous_verify_release_gate',{p_gate_key:'CUSTOMER_1'});if(error)throw error
if(job.status!=='SUCCEEDED'||job.capability!=='qa.release_gate_verify'||job.verification_result?.passed!==true||job.verification_result?.source!=='PERSISTED_RELEASE_GATE')throw new Error('RELEASE_GATE_AGENT_NOT_VERIFIED')
if(job.verification_result?.gate_status==='READY')throw new Error('CUSTOMER_1_MUST_NOT_BE_READY_WITHOUT_REAL_ACCEPTANCE')
if(!job.verification_result?.blockers?.includes('CUSTOMER_ACCEPTANCE_NOT_APPROVED'))throw new Error('CUSTOMER_ACCEPTANCE_BLOCKER_MISSING')
const[{count:dc,error:de},{count:ec,error:ee},{data:agent,error:ae}]=await Promise.all([
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 db.from('autonomous_agents').select('id,status,authority_class').eq('agent_key','release-gate-agent').single()])
if(de)throw de;if(ee)throw ee;if(ae)throw ae
if(dc!==1||ec!==1||agent.status!=='IDLE'||agent.authority_class!=='GREEN')throw new Error('RELEASE_GATE_LEDGER_OR_AGENT_INVALID')
console.log(JSON.stringify({releaseGateAgent:true,jobId:job.id,status:job.verification_result.gate_status,blockers:job.verification_result.blockers}))
