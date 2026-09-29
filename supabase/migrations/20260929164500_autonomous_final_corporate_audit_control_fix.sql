-- Final D14 corporate audit persisted as a control, not an executable RED job.
drop function if exists public.autonomous_run_final_corporate_audit();
-- This preserves agent authority guards while keeping the audit read-only.
create or replace function public.autonomous_run_final_corporate_audit()
returns public.autonomous_control_coverage
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  auditor public.autonomous_agents%rowtype;
  blockers jsonb:='[]'::jsonb;
  control public.autonomous_control_coverage%rowtype;
begin
  select * into auditor
  from public.autonomous_agents
  where agent_key='internal-auditor' and department_id=14 and status='IDLE';
  if auditor.id is null then raise exception 'D14_INTERNAL_AUDITOR_NOT_READY'; end if;

  if exists(select 1 from public.autonomous_control_coverage where control_key<>'corporate-final-audit' and status<>'EFFECTIVE') then
    blockers:=blockers||jsonb_build_array('CONTROL_COVERAGE_NOT_EFFECTIVE');
  end if;
  if exists(select 1 from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED') then
    blockers:=blockers||jsonb_build_array('OPEN_CRITICAL_FINDINGS');
  end if;
  if exists(select 1 from public.autonomous_challenges where challenge_type in('META_AUDIT','RED_TEAM','DIGITAL_TWIN') and status<>'PASSED') then
    blockers:=blockers||jsonb_build_array('CORPORATE_CHALLENGES_INCOMPLETE');
  end if;
  if not exists(select 1 from public.autonomous_challenges where challenge_type='FOUNDER_CHALLENGE' and status='PASSED') then
    blockers:=blockers||jsonb_build_array('FOUNDER_CHALLENGE_PENDING');
  end if;
  if exists(select 1 from public.autonomous_quality_coverage where coverage_key='physical-gps-device' and status<>'COVERED') then
    blockers:=blockers||jsonb_build_array('PHYSICAL_GPS_DEVICE_UNVERIFIED');
  end if;
  if exists(select 1 from public.autonomous_quality_coverage where coverage_key='real-customer-acceptance' and status<>'COVERED') then
    blockers:=blockers||jsonb_build_array('REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED');
  end if;
  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then
    blockers:=blockers||jsonb_build_array('RUNNING_JOBS_PRESENT');
  end if;
  if exists(select 1 from public.autonomous_kill_switches where enabled=true) then
    blockers:=blockers||jsonb_build_array('ACTIVE_KILL_SWITCH');
  end if;

  insert into public.autonomous_control_coverage(
    control_key,domain,control_description,owner_department,auditor_agent_id,
    status,last_verified_at,evidence_refs
  ) values(
    'corporate-final-audit','governance',
    'Final D14 corporate audit across controls, challenges, coverage, findings and runtime safety',
    14,auditor.id,
    case when jsonb_array_length(blockers)=0 then 'EFFECTIVE' else 'BLOCKED' end,
    now(),
    jsonb_build_array(
      'autonomous_control_coverage/current',
      'autonomous_challenges/current',
      'autonomous_quality_coverage/current',
      'autonomous_audit_findings/current',
      jsonb_build_object('blockers',blockers)
    )
  )
  on conflict(control_key) do update set
    auditor_agent_id=excluded.auditor_agent_id,
    status=excluded.status,
    last_verified_at=excluded.last_verified_at,
    evidence_refs=excluded.evidence_refs
  returning * into control;

  update public.autonomous_agents set last_action_at=now(),updated_at=now() where id=auditor.id;
  return control;
end$$;

revoke all on function public.autonomous_run_final_corporate_audit() from public,anon,authenticated;
grant execute on function public.autonomous_run_final_corporate_audit() to service_role;
