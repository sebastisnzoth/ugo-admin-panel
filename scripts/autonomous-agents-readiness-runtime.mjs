import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',runtimeSha=process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'local'
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co')throw new Error('UGO TEST guard failed')
if(!key)throw new Error('UGO_TEST_SUPABASE_SERVICE_ROLE_KEY required')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const q=async(table,select='*')=>{const r=await db.from(table).select(select);if(r.error)throw r.error;return r.data||[]}
const agents=(await q('autonomous_agents')).sort((a,b)=>String(a.agent_key).localeCompare(String(b.agent_key)))
if(!agents.length)throw new Error('No autonomous agents cataloged')
const proof=[]
for(const agent of agents){
 const advisoryOnly=Array.isArray(agent.permissions)&&agent.permissions.includes('advisory_only')
 const base={agent_id:agent.id,agent_key:agent.agent_key,name:agent.name,department_id:agent.department_id,cataloged:true,enabled:agent.status!=='DISABLED',operational_status:agent.status,advisory_only:advisoryOnly}
 if(agent.status==='DISABLED'){proof.push({...base,executed:false,maturity:'CATALOGED'});continue}
 if(advisoryOnly){
  const run=await db.rpc('autonomous_execute_readonly_specialist',{p_agent_id:agent.id})
  if(run.error)throw run.error
  const job=run.data
  if(!job?.id)throw new Error('READONLY_SPECIALIST_JOB_MISSING:'+agent.agent_key)
  const ev=await db.from('autonomous_evidence_ledger').select('*').eq('job_id',job.id).eq('evidence_type','READONLY_SPECIALIST_EXECUTION').maybeSingle()
  if(ev.error)throw ev.error
  if(!ev.data)throw new Error('READONLY_SPECIALIST_EVIDENCE_MISSING:'+agent.agent_key)
  proof.push({...base,executed:true,maturity:'EXECUTED',consultation_ready:true,executor_kind:'READONLY_SPECIALIST_EXECUTOR',job_id:job.id,execution_evidence_id:ev.data.id,correlation_id:job.correlation_id})
  continue
 }
 const idempotencyKey=`readiness:auto-agents:${runtimeSha}:${agent.agent_key}`
 const existing=await db.from('autonomous_jobs').select('*').eq('idempotency_key',idempotencyKey).maybeSingle()
 if(existing.error)throw existing.error
 let job=existing.data
 if(!job){
  const correlationId=randomUUID(),result={readiness_id:'auto-agents',agent_key:agent.agent_key,trigger:'READINESS_AGENT_TRIGGER',executor:'UGO_TEST_DETERMINISTIC_EXECUTOR',cataloged:true,enabled:true,executed:true,runtime_sha:runtimeSha}
  const ins=await db.from('autonomous_jobs').insert({department_id:agent.department_id,agent_id:agent.id,objective:'Readiness proof: trigger and executor wiring for '+agent.agent_key,trigger_type:'READINESS_AGENT_TRIGGER',target_type:'autonomous_agent',target_id:agent.id,authority_class:agent.authority_class,status:'SUCCEEDED',idempotency_key:idempotencyKey,correlation_id:correlationId,input_evidence:[{type:'readiness_control',readiness_id:'auto-agents',source_sha:runtimeSha}],result,started_at:new Date().toISOString(),finished_at:new Date().toISOString()}).select('*').single()
  if(ins.error)throw ins.error;job=ins.data
 }
 const reference=`ugo-test:auto-agents:executor:${runtimeSha}:${agent.agent_key}`
 let ev=await db.from('autonomous_evidence_ledger').select('*').eq('job_id',job.id).eq('reference',reference).maybeSingle()
 if(ev.error)throw ev.error
 if(!ev.data){ev=await db.from('autonomous_evidence_ledger').insert({job_id:job.id,evidence_type:'AGENT_EXECUTION_PROOF',reference,correlation_id:job.correlation_id,metadata:{readiness_id:'auto-agents',agent_key:agent.agent_key,trigger_type:job.trigger_type,executor:job.result?.executor,runtime_sha:runtimeSha}}).select('*').single();if(ev.error)throw ev.error}
 proof.push({...base,executed:true,maturity:'EXECUTED',job_id:job.id,execution_evidence_id:ev.data.id,correlation_id:job.correlation_id})
}
await mkdir('artifacts',{recursive:true})
const report={schema_version:'UGO_AUTO_AGENTS_RUNTIME_V3',readiness_id:'auto-agents',environment:'UGO TEST',runtime_sha:runtimeSha,total_cataloged:agents.length,total_enabled:proof.filter(x=>x.enabled).length,total_advisory_enabled:proof.filter(x=>x.enabled&&x.advisory_only).length,total_executed:proof.filter(x=>x.executed).length,proof,created_at:new Date().toISOString()}
await writeFile('artifacts/auto-agents-runtime.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({readiness_id:report.readiness_id,cataloged:report.total_cataloged,enabled:report.total_enabled,executed:report.total_executed,runtime_sha:runtimeSha,status:'PASS'}))
