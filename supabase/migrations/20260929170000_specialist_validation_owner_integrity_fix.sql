-- Preserve owner-integrity enforcement while restoring the narrow validation-only
-- exception for disabled D9 regression/release-gate specialists.
create or replace function private.autonomous_guard_job_agent()
returns trigger language plpgsql security definer
set search_path=public,private,auth,pg_temp as $$
declare
  agent public.autonomous_agents%rowtype;
  check_authority boolean:=false;
  validation_only boolean:=false;
begin
  if new.agent_id is null then
    if new.status in('QUEUED','RUNNING','WAITING_APPROVAL') then
      raise exception 'AUTONOMOUS_AGENT_REQUIRED' using errcode='23502';
    end if;
    return new;
  end if;

  select * into agent from public.autonomous_agents where id=new.agent_id;
  if agent.id is null then
    raise exception 'AUTONOMOUS_AGENT_NOT_FOUND';
  end if;
  if agent.department_id<>new.department_id then
    raise exception 'AUTONOMOUS_AGENT_DEPARTMENT_MISMATCH';
  end if;

  validation_only :=
    agent.department_id=9
    and agent.agent_key in ('regression-agent','release-gate-agent')
    and new.status='SUCCEEDED'
    and new.authorization_decision='AUTHORIZED_VALIDATION_ONLY'
    and new.capability in ('qa.regression_reconcile_validation','qa.release_gate_verify_validation');

  if agent.status='DISABLED'
     and new.status not in('CANCELLED','BLOCKED')
     and not validation_only then
    raise exception 'DISABLED_AGENT_CANNOT_EXECUTE' using errcode='42501';
  end if;

  if tg_op='INSERT' then
    check_authority:=true;
  else
    check_authority:=new.agent_id is distinct from old.agent_id
      or new.authority_class is distinct from old.authority_class;
  end if;

  if check_authority and
    (case new.authority_class when 'GREEN' then 1 when 'YELLOW' then 2 else 3 end) <
    (case agent.authority_class when 'GREEN' then 1 when 'YELLOW' then 2 else 3 end)
  then
    raise exception 'AUTONOMOUS_AGENT_AUTHORITY_DOWNGRADE' using errcode='42501';
  end if;

  return new;
end $$;

revoke all on function private.autonomous_guard_job_agent() from public,anon,authenticated;
