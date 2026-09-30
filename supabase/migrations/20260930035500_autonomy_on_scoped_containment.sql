-- Scoped containment is compatible with an autonomous company that remains ON.
-- Only a GLOBAL kill switch blocks AUTONOMY_ON readiness; agent/department/capability
-- switches intentionally isolate subsets while the rest of the company keeps operating.

create or replace function public.autonomous_evaluate_on_readiness()
returns public.autonomous_release_gate
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  blockers jsonb:='[]'::jsonb;
  gate public.autonomous_release_gate%rowtype;
  total_agents integer;
  enabled_agents integer;
  action_caps integer;
  recent_worker boolean;
begin
  select count(*),count(*) filter(where status<>'DISABLED')
  into total_agents,enabled_agents
  from public.autonomous_agents;

  select count(*) into action_caps
  from public.autonomous_agents a
  where coalesce(a.permissions ? 'action_work_order',false)
    and exists(
      select 1 from public.autonomous_capability_registry c
      where c.capability_key='agent.work_order.'||a.agent_key
        and c.enabled
        and c.department_id=a.department_id
        and c.authority_class=a.authority_class
    );

  if total_agents<>118 or enabled_agents<>118 then
    blockers:=blockers||jsonb_build_array('AGENT_ROSTER_NOT_READY');
  end if;
  if action_caps<>118 then
    blockers:=blockers||jsonb_build_array('ACTION_CAPABILITIES_INCOMPLETE');
  end if;
  if exists(select 1 from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED') then
    blockers:=blockers||jsonb_build_array('OPEN_CRITICAL_FINDING');
  end if;
  if exists(select 1 from public.autonomous_kill_switches where enabled and scope_type='GLOBAL') then
    blockers:=blockers||jsonb_build_array('GLOBAL_KILL_SWITCH_ACTIVE');
  end if;
  if exists(select 1 from public.autonomous_jobs where status='RUNNING' and lease_expires_at<now()) then
    blockers:=blockers||jsonb_build_array('STALE_AUTONOMOUS_JOB');
  end if;
  if exists(select 1 from public.autonomous_model_routes where status not in('READY','DISABLED')) then
    blockers:=blockers||jsonb_build_array('MODEL_ROUTER_NOT_READY');
  end if;
  if exists(
    select 1 from public.autonomous_control_coverage
    where control_key<>'corporate-final-audit' and status<>'EFFECTIVE'
  ) then
    blockers:=blockers||jsonb_build_array('INTERNAL_CONTROLS_NOT_EFFECTIVE');
  end if;
  if exists(
    select 1 from public.autonomous_challenges
    where challenge_type in('META_AUDIT','RED_TEAM','DIGITAL_TWIN')
      and status<>'PASSED'
  ) then
    blockers:=blockers||jsonb_build_array('AUTONOMOUS_CHALLENGES_INCOMPLETE');
  end if;
  if exists(
    select 1 from public.autonomous_quality_coverage
    where coverage_key not in('physical-gps-device','real-customer-acceptance')
      and status<>'COVERED'
  ) then
    blockers:=blockers||jsonb_build_array('AUTOMATABLE_QA_COVERAGE_INCOMPLETE');
  end if;

  select exists(
    select 1 from public.autonomous_runtime_revisions r
    where r.environment='UGO_TEST'
      and r.workflow='UGO Scheduled Worker Proof TEST'
      and r.created_at>=now()-interval '45 minutes'
      and coalesce((r.verification->>'worker')::boolean,false)
  ) into recent_worker;
  if not recent_worker then
    blockers:=blockers||jsonb_build_array('RECENT_SCHEDULED_WORKER_PROOF_REQUIRED');
  end if;

  insert into public.autonomous_release_gate(
    gate_key,status,blockers,evaluated_at,evaluated_by,meta_qa_validated
  ) values(
    'AUTONOMY_ON',
    case when jsonb_array_length(blockers)=0 then 'READY' else 'BLOCKED' end,
    blockers,now(),auth.uid(),
    not exists(select 1 from public.autonomous_model_routes where status not in('READY','DISABLED'))
  )
  on conflict(gate_key) do update set
    status=excluded.status,
    blockers=excluded.blockers,
    evaluated_at=excluded.evaluated_at,
    evaluated_by=excluded.evaluated_by,
    meta_qa_validated=excluded.meta_qa_validated
  returning * into gate;

  return gate;
end $$;

revoke all on function public.autonomous_evaluate_on_readiness() from public,anon,authenticated;
grant execute on function public.autonomous_evaluate_on_readiness() to service_role;
