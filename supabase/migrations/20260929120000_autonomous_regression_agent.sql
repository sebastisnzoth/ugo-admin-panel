-- Wire D9 Regression Agent as a deterministic observer of persisted permanent regressions.
-- It never accepts caller pass/fail booleans and never mutates QA verdicts.
update public.autonomous_agents
set status='IDLE',
    capability='Reconcile permanent regressions from persisted QA runs',
    permissions='["qa.regression_reconcile"]'::jsonb,
    authority_class='GREEN',
    model_provider=null,
    model_id=null,
    updated_at=now()
where agent_key='regression-agent' and department_id=9 and status='DISABLED';

create or replace function public.autonomous_reconcile_regressions()
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  agent public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  snapshot jsonb;
  regression_count integer:=0;
  verified_count integer:=0;
begin
  select * into agent from public.autonomous_agents
  where agent_key='regression-agent' and department_id=9 and status='IDLE';
  if agent.id is null then raise exception 'REGRESSION_AGENT_NOT_ENABLED'; end if;

  with protected as(
    select distinct scenario_id from public.autonomous_qa_runs where permanent_regression=true
  ), latest as(
    select distinct on(r.scenario_id) r.scenario_id,r.id,r.status,r.permanent_regression,r.finished_at
    from public.autonomous_qa_runs r join protected p on p.scenario_id=r.scenario_id
    order by r.scenario_id,r.created_at desc
  )
  select
    count(*) filter(where status='PASSED' and permanent_regression=true),
    count(*) filter(where status<>'PASSED' or permanent_regression=false)
  into verified_count,regression_count from latest;

  with protected as(
    select distinct scenario_id from public.autonomous_qa_runs where permanent_regression=true
  ), latest as(
    select distinct on(r.scenario_id) r.scenario_id,r.id,r.status,r.permanent_regression,r.finished_at
    from public.autonomous_qa_runs r join protected p on p.scenario_id=r.scenario_id
    order by r.scenario_id,r.created_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'scenario_key',s.scenario_key,
    'run_id',l.id,
    'status',l.status,
    'permanent_regression',l.permanent_regression,
    'finished_at',l.finished_at,
    'regression_detected',(l.status<>'PASSED' or not l.permanent_regression)
  ) order by s.scenario_key),'[]'::jsonb)
  into snapshot
  from latest l join public.autonomous_qa_scenarios s on s.id=l.scenario_id;

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at)
  values(
    9,agent.id,'Reconcile persisted permanent regressions','QA_REGRESSION_RECONCILE',
    'QA_REGRESSION','current','GREEN','SUCCEEDED','qa-regression:'||gen_random_uuid()::text,
    gen_random_uuid(),jsonb_build_array(jsonb_build_object('source','autonomous_qa_runs','caller_assertions',false)),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,'completeness',true,
      'consistency',true,'basis','latest persisted run for every permanent regression scenario'),
    'qa.regression_reconcile',snapshot,'AUTHORIZED_POLICY',snapshot,
    jsonb_build_object('passed',regression_count=0,'verified',verified_count,
      'regressions_detected',regression_count,'source','PERSISTED_QA_STATE'),now(),now()
  ) returning * into job;

  insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(job.id,'QA_REGRESSION_RECONCILIATION','autonomous_qa_runs/permanent-regressions',
    encode(extensions.digest(snapshot::text,'sha256'),'hex'),
    jsonb_build_object('verified',verified_count,'regressions_detected',regression_count),job.correlation_id);

  insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,
    authority_class,policy_version,evidence_refs,authorization_result,correlation_id)
  values(job.id,9,agent.id,
    case when regression_count=0 then 'PERMANENT_REGRESSIONS_VERIFIED' else 'REGRESSION_DETECTED' end,
    case when regression_count=0 then 'Latest persisted runs preserve every permanent regression'
      else 'One or more permanent regression scenarios no longer have a passing permanent latest run' end,
    'GREEN',job.policy_version,jsonb_build_array('autonomous_qa_runs/permanent-regressions'),
    'AUTHORIZED',job.correlation_id);

  update public.autonomous_agents set last_action_at=now(),updated_at=now() where id=agent.id;
  return job;
end $$;

revoke all on function public.autonomous_reconcile_regressions() from public,anon,authenticated;
grant execute on function public.autonomous_reconcile_regressions() to service_role;
