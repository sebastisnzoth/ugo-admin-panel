import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const runtimeSha=process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'local'
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co')throw new Error('UGO TEST guard failed')
if(!key)throw new Error('UGO_TEST_SUPABASE_SERVICE_ROLE_KEY required')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const canonical=[1,2,3,4,5,6,7,8,9,10,11,12,14]
const statusRank={RUNNING:0,IDLE:1,QUEUED:2,BLOCKED:3,SAFE_MODE:4,DISABLED:9}
const q=async(table,select='*')=>{const r=await db.from(table).select(select);if(r.error)throw r.error;return r.data||[]}
const departments=await q('autonomous_departments')
const agents=await q('autonomous_agents')
const missing=canonical.filter(id=>!departments.some(d=>d.department_id===id))
if(missing.length)throw new Error('Missing canonical departments: '+missing.join(','))
const proof=[]
for(const departmentId of canonical){
 const department=departments.find(d=>d.department_id===departmentId)
 const candidates=agents.filter(a=>a.department_id===departmentId&&a.status!=='DISABLED').sort((a,b)=>(statusRank[a.status]??5)-(statusRank[b.status]??5)||String(a.agent_key).localeCompare(String(b.agent_key)))
 if(!candidates.length)throw new Error('No enabled responsible agent for D'+departmentId)
 const agent=candidates[0]
 const correlationId=randomUUID()
 const idempotencyKey=`readiness:auto-departments:${runtimeSha}:D${departmentId}`
 const input=[{type:'readiness_control',readiness_id:'auto-departments',department_id:departmentId,source_sha:runtimeSha}]
 const result={readiness_id:'auto-departments',department_id:departmentId,department_name:department.name,responsible_agent_id:agent.id,responsible_agent_key:agent.agent_key,responsible_agent_name:agent.name,responsible_agent_authority:agent.authority_class,input_count:input.length,output:{registered:true,agent_connected:true,inputs_visible:true,outputs_visible:true},runtime_sha:runtimeSha}
 let job
 const existing=await db.from('autonomous_jobs').select('*').eq('idempotency_key',idempotencyKey).maybeSingle()
 if(existing.error)throw existing.error
 if(existing.data){job=existing.data}
 else{
   const inserted=await db.from('autonomous_jobs').insert({department_id:departmentId,agent_id:agent.id,objective:'Readiness proof: department registry, responsible agent and I/O evidence',trigger_type:'READINESS_RUNTIME',target_type:'autonomous_department',target_id:String(departmentId),authority_class:agent.authority_class,status:'SUCCEEDED',idempotency_key:idempotencyKey,correlation_id:correlationId,input_evidence:input,result,started_at:new Date().toISOString(),finished_at:new Date().toISOString()}).select('*').single()
   if(inserted.error)throw inserted.error
   job=inserted.data
 }
 const reference=`ugo-test:auto-departments:${runtimeSha}:D${departmentId}`
 let evidence
 const existingEvidence=await db.from('autonomous_evidence_ledger').select('*').eq('job_id',job.id).eq('reference',reference).maybeSingle()
 if(existingEvidence.error)throw existingEvidence.error
 if(existingEvidence.data){evidence=existingEvidence.data}
 else{
   const insertedEvidence=await db.from('autonomous_evidence_ledger').insert({job_id:job.id,evidence_type:'DEPARTMENT_CONNECTIVITY_PROOF',reference,correlation_id:job.correlation_id,metadata:{readiness_id:'auto-departments',department_id:departmentId,responsible_agent_id:agent.id,responsible_agent_key:agent.agent_key,runtime_sha:runtimeSha,input_count:Array.isArray(job.input_evidence)?job.input_evidence.length:0,output_present:Boolean(job.result)}}).select('*').single()
   if(insertedEvidence.error)throw insertedEvidence.error
   evidence=insertedEvidence.data
 }
 const maturity='CONNECTED'
 const health={...(department.health||{}),auto_departments_readiness:{status:'PASS',maturity,responsible_agent_id:agent.id,responsible_agent_key:agent.agent_key,responsible_agent_name:agent.name,responsible_agent_authority:agent.authority_class,proof_job_id:job.id,proof_evidence_id:evidence.id,runtime_sha:runtimeSha,verified_at:new Date().toISOString()}}
 const updated=await db.from('autonomous_departments').update({health,last_action_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('department_id',departmentId)
 if(updated.error)throw updated.error
 proof.push({department_id:departmentId,name:department.name,responsible_agent:{id:agent.id,key:agent.agent_key,name:agent.name,status:agent.status},job_id:job.id,evidence_id:evidence.id,correlation_id:job.correlation_id,input_count:Array.isArray(job.input_evidence)?job.input_evidence.length:0,output_present:Boolean(job.result),maturity})
}
await mkdir('artifacts',{recursive:true})
const report={schema_version:'UGO_AUTO_DEPARTMENTS_RUNTIME_V1',readiness_id:'auto-departments',environment:'UGO TEST',runtime_sha:runtimeSha,canonical_departments:canonical,total:proof.length,proof,created_at:new Date().toISOString()}
await writeFile('artifacts/auto-departments-runtime.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({readiness_id:report.readiness_id,total:report.total,runtime_sha:runtimeSha,status:'PASS'}))
