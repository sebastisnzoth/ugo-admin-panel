import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co')throw new Error('UGO TEST guard failed')
if(!key)throw new Error('UGO_TEST_SUPABASE_SERVICE_ROLE_KEY required')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const runtime=JSON.parse(await readFile('artifacts/auto-departments-runtime.json','utf8'))
const canonical=[1,2,3,4,5,6,7,8,9,10,11,12,14]
const failures=[]
if(runtime.runtime_sha!==(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||runtime.runtime_sha))failures.push('runtime SHA mismatch')
for(const id of canonical){
 const row=runtime.proof.find(x=>x.department_id===id)
 if(!row){failures.push('missing runtime proof D'+id);continue}
 if(!row.responsible_agent?.id||row.responsible_agent.status==='DISABLED')failures.push('invalid responsible agent D'+id)
 if(!row.job_id||!row.evidence_id||row.input_count<1||!row.output_present)failures.push('incomplete job/evidence I/O D'+id)
 const health=await db.from('autonomous_departments').select('department_id,health').eq('department_id',id).single()
 if(health.error){failures.push('health read failed D'+id);continue}
 const h=health.data?.health?.auto_departments_readiness
 if(!h||h.status!=='PASS'||h.runtime_sha!==runtime.runtime_sha||h.proof_job_id!==row.job_id||h.proof_evidence_id!==row.evidence_id)failures.push('persisted health mismatch D'+id)
 const job=await db.from('autonomous_jobs').select('id,department_id,agent_id,status,input_evidence,result,correlation_id').eq('id',row.job_id).single()
 if(job.error||job.data?.status!=='SUCCEEDED'||job.data?.department_id!==id||job.data?.agent_id!==row.responsible_agent.id||!Array.isArray(job.data?.input_evidence)||job.data.input_evidence.length<1||!job.data?.result)failures.push('persisted job mismatch D'+id)
 const evidence=await db.from('autonomous_evidence_ledger').select('id,job_id,evidence_type,reference,correlation_id,metadata').eq('id',row.evidence_id).single()
 if(evidence.error||evidence.data?.job_id!==row.job_id||evidence.data?.evidence_type!=='DEPARTMENT_CONNECTIVITY_PROOF'||evidence.data?.correlation_id!==job.data?.correlation_id)failures.push('persisted evidence mismatch D'+id)
}
const report={schema_version:'UGO_AUTO_DEPARTMENTS_JUDGE_V1',readiness_id:'auto-departments',validator:'Judge',result:failures.length?'FAIL':'PASS',runtime_sha:runtime.runtime_sha,checked_departments:canonical.length,failures,created_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/auto-departments-judge.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report));if(failures.length)process.exit(1)
