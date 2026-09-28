-- Only a persisted baseline -> seeded failure -> recovered rerun on one demo
-- service can validate Meta-QA. Old synthetic calibration rows cannot do so.
create table if not exists public.autonomous_meta_qa_calibrations(
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.autonomous_qa_scenarios(id),
  service_id uuid not null references public.servicios(id),
  baseline_run_id uuid not null unique references public.autonomous_qa_runs(id),
  seeded_run_id uuid not null unique references public.autonomous_qa_runs(id),
  rerun_id uuid not null unique references public.autonomous_qa_runs(id),
  job_id uuid not null unique references public.autonomous_jobs(id),
  created_at timestamptz not null default now()
);
alter table public.autonomous_meta_qa_calibrations enable row level security;
revoke all on public.autonomous_meta_qa_calibrations from public,anon,authenticated;
grant select on public.autonomous_meta_qa_calibrations to service_role,authenticated;
create policy meta_qa_calibrations_superadmin_read
on public.autonomous_meta_qa_calibrations for select to authenticated
using(private.is_superadmin());

update public.autonomous_agents
set status='IDLE',capability='Calibrate seeded defects against persisted UGO TEST service',
    permissions='["qa.meta_persisted_calibration"]'::jsonb,
    authority_class='GREEN',model_provider=null,model_id=null,updated_at=now()
where agent_key='meta-qa-agent' and department_id=9 and status='DISABLED';

-- Clear stale flags set by the former synthetic superadmin_validate_meta_qa.
update public.autonomous_release_gate set status='BLOCKED',
    meta_qa_validated=false,meta_qa_run_id=null,
    blockers=case when blockers ? 'META_QA_NOT_VALIDATED' then blockers
      else blockers||'["META_QA_NOT_VALIDATED"]'::jsonb end,
    evaluated_at=now()
where gate_key='CUSTOMER_1';

create or replace function public.autonomous_record_meta_qa_calibration(
  p_baseline_run_id uuid,p_seeded_run_id uuid,p_rerun_id uuid)
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  baseline public.autonomous_qa_runs%rowtype;
  seeded public.autonomous_qa_runs%rowtype;
  rerun public.autonomous_qa_runs%rowtype;
  agent public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  sid uuid;
  scenario public.autonomous_qa_scenarios%rowtype;
  proof jsonb;
begin
  select * into baseline from public.autonomous_qa_runs where id=p_baseline_run_id;
  select * into seeded from public.autonomous_qa_runs where id=p_seeded_run_id;
  select * into rerun from public.autonomous_qa_runs where id=p_rerun_id;
  if baseline.id is null or seeded.id is null or rerun.id is null or
     baseline.scenario_id is distinct from seeded.scenario_id or
     baseline.scenario_id is distinct from rerun.scenario_id then
    raise exception 'META_QA_THREE_RUNS_REQUIRED';
  end if;
  select * into scenario from public.autonomous_qa_scenarios
    where id=baseline.scenario_id and seeded_defect=true and status='ACTIVE';
  if scenario.id is null then raise exception 'ACTIVE_SEEDED_SCENARIO_REQUIRED';end if;
  if baseline.simulator_results->>'service_id' is null or
     baseline.simulator_results->>'service_id' is distinct from seeded.simulator_results->>'service_id' or
     baseline.simulator_results->>'service_id' is distinct from rerun.simulator_results->>'service_id' then
    raise exception 'META_QA_SERVICE_BINDING_MISMATCH';
  end if;
  sid:=(baseline.simulator_results->>'service_id')::uuid;
  if not exists(select 1 from public.servicios where id=sid and ambiente='demo' and estado='completado') or
     not exists(select 1 from public.evidencias_servicio where servicio_id=sid and tipo='antes') or
     not exists(select 1 from public.evidencias_servicio where servicio_id=sid and tipo='despues') or
     (select count(distinct autor_tipo) from public.resenas where servicio_id=sid)<2 then
    raise exception 'META_QA_PERSISTED_DEMO_SERVICE_REQUIRED';
  end if;
  if not (baseline.status='PASSED' and baseline.judge_result->>'passed'='true'
      and baseline.chaos_result->>'seeded_defect_injected'='false'
      and seeded.status='FAILED' and seeded.judge_result->>'passed'='false'
      and seeded.judge_result->>'seeded_defect_detected'='true'
      and seeded.chaos_result->>'seeded_defect_injected'='true'
      and rerun.status='PASSED' and rerun.judge_result->>'passed'='true'
      and rerun.chaos_result->>'seeded_defect_injected'='false'
      and rerun.permanent_regression=true
      and baseline.finished_at <= seeded.started_at
      and seeded.finished_at <= rerun.started_at) then
    raise exception 'META_QA_DETECT_REMEDIATE_RERUN_REQUIRED';
  end if;
  select * into agent from public.autonomous_agents
    where agent_key='meta-qa-agent' and department_id=9 and status='IDLE';
  if agent.id is null then raise exception 'META_QA_AGENT_NOT_ENABLED';end if;
  proof:=jsonb_build_object('passed',true,'simulated_service',true,
    'baseline_run_id',baseline.id,'seeded_run_id',seeded.id,
    'rerun_id',rerun.id,'seeded_defect_detected',true,
    'permanent_regression',true,'customer_acceptance',false);
  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at)
  values(9,agent.id,'Calibrate persisted seeded defect and regression','QA_META_CALIBRATION',
    'QA_RUN',rerun.id::text,sid,'GREEN','SUCCEEDED',
    'qa-meta:'||rerun.id::text,rerun.correlation_id,
    jsonb_build_array(baseline.id,seeded.id,rerun.id),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,
      'completeness',true,'consistency',true,'basis','three persisted UGO TEST QA runs'),
    'qa.meta_persisted_calibration',proof,'AUTHORIZED_POLICY',proof,proof,
    baseline.started_at,rerun.finished_at)
  on conflict(idempotency_key) do nothing returning * into job;
  if job.id is null then
    select * into job from public.autonomous_jobs
      where idempotency_key='qa-meta:'||rerun.id::text;
    return job;
  end if;
  insert into public.autonomous_meta_qa_calibrations(
    scenario_id,service_id,baseline_run_id,seeded_run_id,rerun_id,job_id)
  values(scenario.id,sid,baseline.id,seeded.id,rerun.id,job.id);
  insert into public.autonomous_evidence_ledger
    (job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(job.id,'META_QA_CALIBRATION','autonomous_meta_qa_calibrations/'||rerun.id::text,
    encode(extensions.digest(proof::text,'sha256'),'hex'),
    jsonb_build_object('simulated_service',true),job.correlation_id);
  insert into public.autonomous_decision_ledger
    (job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
     evidence_refs,authorization_result,correlation_id)
  values(job.id,9,agent.id,'META_QA_CALIBRATED',
    'Persisted baseline, seeded failure and regression independently reconciled',
    'GREEN',job.policy_version,jsonb_build_array('autonomous_meta_qa_calibrations/'||rerun.id::text),
    'AUTHORIZED',job.correlation_id);
  update public.autonomous_agents set last_action_at=now(),updated_at=now() where id=agent.id;
  insert into public.autonomous_release_gate(gate_key,status,blockers,meta_qa_validated,meta_qa_run_id)
  values('CUSTOMER_1','BLOCKED','["CUSTOMER_ACCEPTANCE_NOT_APPROVED"]'::jsonb,true,rerun.id)
  on conflict(gate_key) do update set meta_qa_validated=true,meta_qa_run_id=rerun.id;
  return job;
end $$;
revoke all on function public.autonomous_record_meta_qa_calibration(uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.autonomous_record_meta_qa_calibration(uuid,uuid,uuid)
  to service_role;

-- Super Admin can inspect an existing calibration; this RPC no longer creates
-- an artificial failed run or turns the gate green from a caller assertion.
create or replace function public.superadmin_validate_meta_qa(p_scenario_id uuid)
returns public.autonomous_qa_runs language plpgsql security definer
set search_path=public,private,auth,pg_temp as $$
declare verified public.autonomous_qa_runs%rowtype;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;
  select r.* into verified from public.autonomous_meta_qa_calibrations c
    join public.autonomous_qa_runs r on r.id=c.rerun_id
    join public.autonomous_jobs j on j.id=c.job_id
    where c.scenario_id=p_scenario_id and j.status='SUCCEEDED'
      and j.verification_result->>'passed'='true'
    order by c.created_at desc limit 1;
  if verified.id is null then raise exception 'PERSISTED_META_QA_CALIBRATION_REQUIRED';end if;
  return verified;
end $$;
revoke all on function public.superadmin_validate_meta_qa(uuid) from public,anon;
grant execute on function public.superadmin_validate_meta_qa(uuid) to authenticated;
