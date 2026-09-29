alter table public.autonomous_qa_remediations
  add column if not exists correlation_id uuid,
  add column if not exists fix_applied_at timestamptz,
  add column if not exists fix_evidence jsonb;

update public.autonomous_qa_remediations r
set correlation_id=coalesce(r.correlation_id,q.correlation_id,gen_random_uuid())
from public.autonomous_qa_runs q
where q.id=r.failed_run_id and r.correlation_id is null;

create index if not exists autonomous_qa_remediations_correlation_idx
  on public.autonomous_qa_remediations(correlation_id);

create or replace function public.autonomous_execute_remediation_regression(p_correlation_id uuid default gen_random_uuid())
returns jsonb language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  s public.autonomous_qa_scenarios%rowtype;
  failed public.autonomous_qa_runs%rowtype;
  rerun public.autonomous_qa_runs%rowtype;
  remediation public.autonomous_qa_remediations%rowtype;
  agent public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  sid uuid;
  proof jsonb;
begin
  if current_user not in('postgres','service_role','supabase_admin')
     and coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','')<>'service_role'
  then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;

  select * into s from public.autonomous_qa_scenarios
   where scenario_key='qa-meta-seeded-defect' and seeded_defect=true and status='ACTIVE';
  if s.id is null then raise exception 'ACTIVE_SEEDED_DEFECT_REQUIRED'; end if;

  select v.id into sid from public.servicios v
   where v.ambiente='demo' and v.estado='completado'
     and coalesce(v.metadata->>'qa_p0','false')='true'
     and exists(select 1 from public.evidencias_servicio e where e.servicio_id=v.id and e.tipo='antes')
     and exists(select 1 from public.evidencias_servicio e where e.servicio_id=v.id and e.tipo='despues')
     and (select count(distinct rr.autor_tipo) from public.resenas rr where rr.servicio_id=v.id)>=2
   order by v.created_at desc limit 1;
  if sid is null then raise exception 'COMPLETED_P0_TEST_FIXTURE_REQUIRED'; end if;

  failed:=public.autonomous_run_meta_qa_seeded_defect(s.id,sid,true);
  update public.autonomous_qa_runs set correlation_id=p_correlation_id
   where id=failed.id returning * into failed;
  if failed.status<>'FAILED' or failed.judge_result->>'seeded_defect_detected'<>'true'
     or coalesce(failed.remediation_request,'')='' then
    raise exception 'CONTROLLED_FAILURE_NOT_DETECTED';
  end if;

  insert into public.autonomous_qa_remediations(
    scenario_id,failed_run_id,status,owner_department,diagnosis,requested_fix,correlation_id)
  values(s.id,failed.id,'OPEN',9,failed.diagnosis,
    'Remove controlled seeded defect injection, rerun persisted-state scenario, and promote only a passing rerun to permanent regression.',
    p_correlation_id)
  returning * into remediation;

  update public.autonomous_qa_remediations
   set status='FIXED',fix_applied_at=now(),
       fix_evidence=jsonb_build_object(
         'strategy','REMOVE_CONTROLLED_SEEDED_DEFECT',
         'business_state_mutated',false,
         'environment','UGO TEST',
         'service_id',sid)
   where id=remediation.id returning * into remediation;

  rerun:=public.autonomous_run_meta_qa_seeded_defect(s.id,sid,false);
  update public.autonomous_qa_runs
   set correlation_id=p_correlation_id,permanent_regression=true
   where id=rerun.id returning * into rerun;
  if rerun.status<>'PASSED' or rerun.judge_result->>'passed'<>'true'
     or rerun.permanent_regression is distinct from true then
    raise exception 'REMEDIATION_RERUN_NOT_PASSING';
  end if;

  update public.autonomous_qa_remediations
   set status='VERIFIED',rerun_id=rerun.id,verified_at=now()
   where id=remediation.id returning * into remediation;

  select * into agent from public.autonomous_agents
   where agent_key='meta-qa-agent' and department_id=9 and status='IDLE';
  if agent.id is null then raise exception 'META_QA_AGENT_NOT_ENABLED'; end if;

  proof:=jsonb_build_object(
    'passed',true,'environment','UGO TEST','service_id',sid,
    'failed_run_id',failed.id,'remediation_id',remediation.id,'rerun_id',rerun.id,
    'initial_failure','DETECTED','remediation','VERIFIED',
    'rerun_status',rerun.status,'permanent_regression',rerun.permanent_regression,
    'correlation_id',p_correlation_id,'production_touched',false);

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at)
  values(9,agent.id,'Detect, remediate, rerun and persist regression',
    'QA_REMEDIATION_REGRESSION','QA_REMEDIATION',remediation.id::text,sid,
    'GREEN','SUCCEEDED','qa-remediation-regression:'||p_correlation_id::text,p_correlation_id,
    jsonb_build_array(failed.id,remediation.id,rerun.id),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true,
      'basis','persisted seeded failure -> governed remediation -> persisted passing rerun'),
    'qa.remediation_regression',proof,'AUTHORIZED_POLICY',proof,proof,failed.started_at,rerun.finished_at)
  returning * into job;

  insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(job.id,'QA_REMEDIATION_REGRESSION',
    'autonomous_qa_remediations/'||remediation.id::text,
    encode(extensions.digest(proof::text,'sha256'),'hex'),
    jsonb_build_object('failed_run_id',failed.id,'rerun_id',rerun.id,'permanent_regression',true),
    p_correlation_id);

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
    evidence_refs,authorization_result,correlation_id)
  values(job.id,9,agent.id,'REMEDIATION_VERIFIED',
    'Controlled persisted-state failure was detected, safely remediated, rerun PASS and persisted as regression',
    'GREEN',job.policy_version,
    jsonb_build_array('autonomous_qa_remediations/'||remediation.id::text),
    'AUTHORIZED',p_correlation_id);

  return proof||jsonb_build_object('job_id',job.id);
end$$;

revoke all on function public.autonomous_execute_remediation_regression(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_execute_remediation_regression(uuid) to service_role;
