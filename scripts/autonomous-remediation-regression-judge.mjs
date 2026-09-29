import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',correlationId=process.env.UGO_REMEDIATION_CORRELATION_ID||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key||!correlationId)throw new Error('UGO_REMEDIATION_JUDGE_INPUT_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:r,error:re}=await db.from('autonomous_qa_remediations').select('id,status,failed_run_id,rerun_id,correlation_id,fix_evidence').eq('correlation_id',correlationId).single();if(re)throw re
const[{data:f,error:fe},{data:p,error:pe},{data:j,error:je}]=await Promise.all([
 db.from('autonomous_qa_runs').select('id,status,judge_result,correlation_id').eq('id',r.failed_run_id).single(),
 db.from('autonomous_qa_runs').select('id,status,judge_result,permanent_regression,correlation_id').eq('id',r.rerun_id).single(),
 db.from('autonomous_jobs').select('id,status,verification_result,correlation_id').eq('correlation_id',correlationId).eq('trigger_type','QA_REMEDIATION_REGRESSION').single()
]);if(fe)throw fe;if(pe)throw pe;if(je)throw je
const[{count:e,error:ee},{count:d,error:de}]=await Promise.all([
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',j.id).eq('correlation_id',correlationId),
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',j.id).eq('correlation_id',correlationId)
]);if(ee)throw ee;if(de)throw de
if(r.status!=='VERIFIED'||f.status!=='FAILED'||f.judge_result?.seeded_defect_detected!==true||p.status!=='PASSED'||p.permanent_regression!==true||j.status!=='SUCCEEDED'||j.verification_result?.passed!==true||e!==1||d!==1)throw new Error('REMEDIATION_REGRESSION_JUDGE_FAILED')
for(const x of[r,f,p,j])if(x.correlation_id!==correlationId)throw new Error('REMEDIATION_CORRELATION_MISMATCH')
console.log(JSON.stringify({judge:'PASS',correlationId,remediationId:r.id,failedRunId:f.id,rerunId:p.id,jobId:j.id,evidenceCount:e,decisionCount:d}))
