import { createClient } from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const correlationId=process.env.UGO_EXCEPTION_RECOVERY_CORRELATION_ID||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key||!correlationId)throw new Error('UGO_EXCEPTION_RECOVERY_JUDGE_INPUT_REQUIRED')

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:job,error:je}=await db.from('autonomous_jobs')
  .select('id,status,attempt_count,authorization_decision,verification_result,correlation_id')
  .eq('correlation_id',correlationId).eq('trigger_type','EXCEPTION_RECOVERY_TEST').single()
if(je)throw je

const [
  {data:incident,error:ie},
  {data:recovery,error:re},
  {count:decisions,error:de},
  {count:evidence,error:ee},
  {data:state,error:se},
  {data:kills,error:ke},
  {count:running,error:rue},
  {count:audit,error:ae}
]=await Promise.all([
  db.from('development_incidents').select('id,status,resolved_at,metadata').eq('metadata->>correlation_id',correlationId).single(),
  db.from('autonomous_recovery_audits').select('id,scope_type,scope_key,decision,verification,evidence_hash').eq('scope_type','JOB').eq('scope_key',job.id).single(),
  db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id).eq('correlation_id',correlationId),
  db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id).eq('correlation_id',correlationId),
  db.from('autonomous_company_state').select('mode').eq('singleton',true).single(),
  db.from('autonomous_kill_switches').select('id').eq('enabled',true).order('id',{ascending:true}),
  db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING'),
  db.from('audit_log').select('id',{count:'exact',head:true}).eq('evento','autonomy.exception_recovery.completed').eq('entidad_id',job.id)
])
for(const e of[ie,re,de,ee,se,ke,rue,ae])if(e)throw e

if(job.status!=='SUCCEEDED'||job.attempt_count!==1||job.authorization_decision!=='AUTHORIZED_POLICY'||job.verification_result?.passed!==true)throw new Error('RECOVERY_JOB_NOT_VERIFIED')
if(incident.status!=='resolved'||!incident.resolved_at||incident.metadata?.recovery_status!=='VERIFIED')throw new Error('INCIDENT_NOT_RESOLVED')
if(
  recovery.decision!=='RECOVER'
  ||recovery.verification?.recovery_action!=='autonomous_worker_cycle'
  ||recovery.verification?.manual_sql_state_edit!==false
  ||recovery.verification?.manual_github_state_edit!==false
  ||recovery.verification?.kill_switches_preserved!==true
  ||!recovery.evidence_hash
)throw new Error('RECOVERY_AUDIT_INVALID')
if((decisions||0)<2||(evidence||0)<2||(audit||0)<1)throw new Error('RECOVERY_AUDIT_TRAIL_INCOMPLETE')

const initialMode=recovery.verification?.initial_mode
const expectedKillIds=[...(recovery.verification?.initial_kill_switch_ids||[])].sort()
const actualKillIds=(kills||[]).map(x=>x.id).sort()
if(!['OFF','ON'].includes(initialMode)||state.mode!==initialMode||JSON.stringify(actualKillIds)!==JSON.stringify(expectedKillIds)||running!==0)throw new Error('SENTINEL_STATE_PRESERVATION_FAILED')

console.log(JSON.stringify({
  judge:'PASS',sentinel:'PASS',correlationId,
  incidentId:incident.id,jobId:job.id,recoveryAuditId:recovery.id,
  decisionLedgerCount:decisions,evidenceLedgerCount:evidence,auditLogCount:audit,
  initialMode,finalMode:state.mode,activeKillSwitches:actualKillIds.length,
  killSwitchesPreserved:true,runningJobs:running
}))
