-- Backend fail-closed guard for advisory-only autonomous specialists.
-- A stale/older UI must not be able to enqueue or promote an advisory specialist
-- into an operational job merely because the agent is IDLE.
create or replace function private.autonomous_guard_advisory_agent_no_mutation()
returns trigger
language plpgsql
security definer
set search_path=public,private,auth,pg_temp
as $$
declare
  advisory boolean:=false;
begin
  if new.agent_id is null then
    return new;
  end if;

  select coalesce(a.permissions ? 'advisory_only',false)
    into advisory
  from public.autonomous_agents a
  where a.id=new.agent_id;

  if advisory and new.status not in ('CANCELLED','BLOCKED') then
    raise exception 'ADVISORY_AGENT_NO_MUTATION_EXECUTOR' using errcode='42501';
  end if;

  return new;
end $$;

revoke all on function private.autonomous_guard_advisory_agent_no_mutation() from public,anon,authenticated;

drop trigger if exists autonomous_guard_advisory_agent_no_mutation on public.autonomous_jobs;
create trigger autonomous_guard_advisory_agent_no_mutation
before insert or update of agent_id,status
on public.autonomous_jobs
for each row
execute function private.autonomous_guard_advisory_agent_no_mutation();
