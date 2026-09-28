-- Registration alone never grants the right to enqueue or execute work.
-- Existing historical jobs are left intact; new assignments must match the
-- enabled agent's department and cannot downgrade its authority class.
create or replace function private.autonomous_guard_job_agent()
returns trigger language plpgsql security definer
set search_path=public,private,auth,pg_temp as $$
declare agent public.autonomous_agents%rowtype;check_authority boolean:=false;
begin
  if new.agent_id is null then return new;end if;
  select * into agent from public.autonomous_agents where id=new.agent_id;
  if agent.id is null then raise exception 'AUTONOMOUS_AGENT_NOT_FOUND';end if;
  if agent.department_id<>new.department_id then
    raise exception 'AUTONOMOUS_AGENT_DEPARTMENT_MISMATCH';
  end if;
  if agent.status='DISABLED' and new.status not in('CANCELLED','BLOCKED') then
    raise exception 'DISABLED_AGENT_CANNOT_EXECUTE' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    check_authority:=true;
  else
    check_authority:=new.agent_id is distinct from old.agent_id or
      new.authority_class is distinct from old.authority_class;
  end if;
  if check_authority then
    if (case new.authority_class when 'GREEN' then 1 when 'YELLOW' then 2 else 3 end)
       < (case agent.authority_class when 'GREEN' then 1 when 'YELLOW' then 2 else 3 end) then
      raise exception 'AUTONOMOUS_AGENT_AUTHORITY_DOWNGRADE' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists autonomous_job_agent_guard on public.autonomous_jobs;
create trigger autonomous_job_agent_guard
before insert or update of agent_id,department_id,authority_class,status
on public.autonomous_jobs for each row
execute function private.autonomous_guard_job_agent();
revoke all on function private.autonomous_guard_job_agent() from public,anon,authenticated;
