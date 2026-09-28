import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await db.rpc('autonomous_qa_director_reconcile');if(error)throw error
if(data?.source!=='PERSISTED_QA_EVIDENCE'||data?.director_status!=='DISABLED'||data?.director_authority!=='YELLOW')throw new Error('QA_DIRECTOR_GOVERNANCE_INVALID')
if(data?.can_self_certify!==false||data?.execution_allowed!==false||data?.customer_1_ready!==false)throw new Error('QA_DIRECTOR_ESCALATED_AUTHORITY')
if(data?.d14_enabled!==6||data?.release_gate_status!=='BLOCKED'||data?.consistent!==true)throw new Error('QA_DIRECTOR_EVIDENCE_INCONSISTENT')
console.log(JSON.stringify({qaDirectorReconciler:true,evidenceHash:data.evidence_hash,directorStatus:data.director_status,releaseGate:data.release_gate_status}))
