-- Executable autonomous work must always have a persisted owner.
-- Preserve historical TEST records, but close legacy ownerless pending fixtures.
create or replace function private.autonomous_guard_job_agent()
returns trigger language plpgsql security definer
set search_path=public,private,auth,pg_temp as $$
declare agent public.autonomous_agents%rowtype;check_authority boolean:=false;
begin
  if new.agent_id is null then
    if new.status in('QUEUED','RUNNING','WAITING_APPROVAL') then
      raise exception 'AUTONOMOUS_AGENT_REQUIRED' using errcode='23502';
    end if;
    return new;
  end if;
  select * into agent from public.autonomous_agents where id=new.agent_id;
  if agent.id is null then raise exception 'AUTONOMOUS_AGENT_NOT_FOUND';end if;
  if agent.department_id<>new.department_id then raise exception 'AUTONOMOUS_AGENT_DEPARTMENT_MISMATCH';end if;
  if agent.status='DISABLED' and new.status not in('CANCELLED','BLOCKED') then raise exception 'DISABLED_AGENT_CANNOT_EXECUTE' using errcode='42501';end if;
  if tg_op='INSERT' then check_authority:=true;
  else check_authority:=new.agent_id is distinct from old.agent_id or new.authority_class is distinct from old.authority_class;end if;
  if check_authority and
    (case new.authority_class when 'GREEN' then 1 when 'YELLOW' then 2 else 3 end) <
    (case agent.authority_class when 'GREEN' then 1 when 'YELLOW' then 2 else 3 end)
  then raise exception 'AUTONOMOUS_AGENT_AUTHORITY_DOWNGRADE' using errcode='42501';end if;
  return new;
end $$;

-- Close only legacy TEST fixtures that can never be valid autonomous execution.
update public.autonomous_jobs
set status='CANCELLED',
    failure_reason='CANCELLED: legacy TEST fixture missing autonomous owner',
    blocked_reason='OWNER_INTEGRITY_REMEDIATION',
    finished_at=coalesce(finished_at,now()),
    lease_owner=null,
    lease_expires_at=null
where agent_id is null
  and trigger_type='TEST'
  and status in('QUEUED','WAITING_APPROVAL');

revoke all on function private.autonomous_guard_job_agent() from public,anon,authenticated;

-- Negative authority QA fixtures are assertions, not real human approvals.
update public.autonomous_jobs
set status='CANCELLED',
    failure_reason='CANCELLED: completed negative authority QA fixture',
    blocked_reason='QA_NEGATIVE_FIXTURE_COMPLETE',
    finished_at=coalesce(finished_at,now())
where idempotency_key in('qa-red-negative-20260929','qa-yellow-negative-20260929')
  and trigger_type='QA'
  and status='WAITING_APPROVAL';
