import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:validation,error:ve}=await db.rpc('autonomous_validate_specialist',{p_agent_key:'release-gate-agent'});if(ve)throw ve
if(validation?.status!=='DISABLED'||validation?.validation_only!==true)throw new Error('RELEASE_GATE_VALIDATION_GUARD_INVALID')
const{data:job,error}=await db.rpc('autonomous_verify_release_gate_validation',{p_gate_key:'CUSTOMER_1'});if(error)throw error
if(job.status!=='SUCCEEDED'||job.capability!=='qa.release_gate_verify_validation'||job.verification_result?.passed!==true||job.verification_result?.source!=='PERSISTED_RELEASE_GATE')throw new Error('RELEASE_GATE_VALIDATION_NOT_VERIFIED')
if(job.verification_result?.gate_status==='READY')throw new Error('CUSTOMER_1_MUST_NOT_BE_READY_WITHOUT_REAL_ACCEPTANCE')
if(!job.verification_result?.blockers?.includes('CUSTOMER_ACCEPTANCE_NOT_APPROVED'))throw new Error('CUSTOMER_ACCEPTANCE_BLOCKER_MISSING')
console.log(JSON.stringify({releaseGateAgent:true,validationOnly:true,agentStatus:validation.status,gateStatus:job.verification_result.gate_status,blockers:job.verification_result.blockers,jobId:job.id}))
