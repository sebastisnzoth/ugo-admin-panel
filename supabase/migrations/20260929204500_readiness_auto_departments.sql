-- Deterministic TEST-only readiness proof for the autonomous department registry.
-- Persists one verification job + evidence row per real department without executing business mutations.
create or replace function public.autonomous_verify_department_registry(p_readiness_id text default 'auto-departments')
returns table(
  department_id integer,
  job_id uuid,
  evidence_id uuid,
  passed boolean,
  responsible_agent text,
  inputs jsonb,
  outputs jsonb
)
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  d public.autonomous_departments%rowtype;
  a public.autonomous_agents%rowtype;
  v_job uuid;
  v_evidence uuid;
  v_correlation uuid;
  v_inputs jsonb;
  v_outputs jsonb;
  v_pass boolean;
  v_enabled integer;
begin
  if p_readiness_id is distinct from 'auto-departments' then
    raise exception 'UNSUPPORTED_READINESS_ID' using errcode='22023';
  end if;

  for d in select * from public.autonomous_departments order by department_id loop
    select count(*) into v_enabled
      from public.autonomous_agents
     where autonomous_agents.department_id=d.department_id
       and status<>'DISABLED';

    select * into a
      from public.autonomous_agents
     where autonomous_agents.department_id=d.department_id
       and status<>'DISABLED'
     order by case authority_class when 'GREEN' then 0 when 'YELLOW' then 1 else 2 end, agent_key
     limit 1;

    v_pass := d.name is not null and d.objective is not null and a.id is not null and v_enabled>0;
    v_correlation := gen_random_uuid();
    v_inputs := jsonb_build_object(
      'readiness_id',p_readiness_id,
      'department_id',d.department_id,
      'department_objective',d.objective,
      'responsible_agent_id',a.id,
      'responsible_agent_key',a.agent_key,
      'responsible_agent_name',a.name,
      'permissions',coalesce(a.permissions,'[]'::jsonb)
    );
    v_outputs := jsonb_build_object(
      'registry_visible',true,
      'department_status',d.status,
      'enabled_agents',v_enabled,
      'responsible_agent',a.name,
      'input_contract',jsonb_build_array('department objective','agent capability','permissions','current persisted state'),
      'output_contract',jsonb_build_array('autonomous_jobs','autonomous_evidence_ledger','decision ledger','Super Admin department view'),
      'maturity',case when v_pass then 'CONNECTED' else 'INCOMPLETE' end
    );

    insert into public.autonomous_jobs(
      department_id,agent_id,objective,trigger_type,target_type,target_id,
      authority_class,status,idempotency_key,correlation_id,input_evidence,result,
      started_at,finished_at,data_quality_status,capability,data_quality_assessment,
      authorization_decision,execution_result,verification_result
    ) values(
      d.department_id,a.id,'Verify autonomous department registry wiring','READINESS',
      'DEPARTMENT',d.department_id::text,
      coalesce(a.authority_class,'GREEN'),case when v_pass then 'SUCCEEDED' else 'FAILED' end,
      'readiness:auto-departments:'||d.department_id::text||':'||v_correlation::text,
      v_correlation,jsonb_build_array(v_inputs),v_outputs,
      now(),now(),'TRUSTED','readiness.auto-departments',
      jsonb_build_object('trusted',true,'source','persisted_registry'),
      'READ_ONLY_VERIFICATION',v_outputs,jsonb_build_object('passed',v_pass,'readiness_id',p_readiness_id)
    ) returning id into v_job;

    insert into public.autonomous_evidence_ledger(
      job_id,evidence_type,reference,evidence_hash,metadata,correlation_id
    ) values(
      v_job,'DEPARTMENT_REGISTRY_RUNTIME_PROOF',
      'autonomous_departments/'||d.department_id::text||'/readiness',
      encode(digest((v_inputs||v_outputs)::text,'sha256'),'hex'),
      jsonb_build_object('readiness_id',p_readiness_id,'inputs',v_inputs,'outputs',v_outputs,'passed',v_pass),
      v_correlation
    ) returning id into v_evidence;

    insert into public.autonomous_decision_ledger(
      job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
      evidence_refs,authorization_result,correlation_id
    ) values(
      v_job,d.department_id,a.id,
      case when v_pass then 'DEPARTMENT_REGISTRY_VERIFIED' else 'DEPARTMENT_REGISTRY_INCOMPLETE' end,
      case when v_pass then 'Visible department has responsible enabled agent and declared inputs/outputs'
           else 'Department registry is incomplete' end,
      coalesce(a.authority_class,'GREEN'),'AUTONOMOUS_CORP_V1',
      jsonb_build_array('autonomous_evidence_ledger/'||v_evidence::text),
      case when v_pass then 'AUTHORIZED' else 'DENIED' end,
      v_correlation
    );

    department_id:=d.department_id;
    job_id:=v_job;
    evidence_id:=v_evidence;
    passed:=v_pass;
    responsible_agent:=a.name;
    inputs:=v_inputs;
    outputs:=v_outputs;
    return next;
  end loop;
end
$$;

revoke all on function public.autonomous_verify_department_registry(text) from public,anon,authenticated;
grant execute on function public.autonomous_verify_department_registry(text) to service_role;
