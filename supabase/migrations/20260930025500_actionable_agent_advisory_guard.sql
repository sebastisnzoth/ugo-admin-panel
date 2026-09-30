-- Extend the advisory-agent guard for the new governed work-order envelope.
-- Advisory agents remain unable to create arbitrary autonomous jobs or business mutations.

create or replace function private.autonomous_guard_advisory_agent_no_mutation()
returns trigger
language plpgsql
security definer
set search_path=public,private,auth,pg_temp
as $$
declare
  a public.autonomous_agents%rowtype;
  advisory boolean:=false;
  action_allowed boolean:=false;
  readonly_allowed boolean:=false;
begin
  if new.agent_id is null then return new; end if;
  select * into a from public.autonomous_agents where id=new.agent_id;
  advisory:=coalesce(a.permissions ? 'advisory_only',false);

  if not advisory then return new; end if;

  readonly_allowed:=(
    new.status='SUCCEEDED'
    and new.trigger_type='READONLY_SPECIALIST_EXECUTOR'
    and new.authorization_decision='AUTHORIZED_ADVISORY_EXECUTOR'
    and new.capability like 'advisory.readonly.%'
    and coalesce(new.verification_result->>'readonly','false')='true'
    and coalesce(new.verification_result->>'aggregate_only','false')='true'
  );

  action_allowed:=(
    coalesce(a.permissions ? 'action_work_order',false)
    and new.trigger_type='AGENT_WORK_ORDER'
    and new.capability='agent.work_order.'||a.agent_key
    and new.target_type='autonomous_agent'
    and new.target_id=a.id::text
    and new.status in('QUEUED','RUNNING','WAITING_APPROVAL','SUCCEEDED')
    and (
      new.status<>'SUCCEEDED'
      or (
        coalesce(new.verification_result->>'passed','false')='true'
        and coalesce(new.verification_result->>'persisted_work_order','false')='true'
        and coalesce(new.verification_result->>'business_mutation','false')='false'
      )
    )
  );

  if new.status not in('CANCELLED','BLOCKED')
     and not readonly_allowed
     and not action_allowed
  then
    raise exception 'ADVISORY_AGENT_NO_MUTATION_EXECUTOR' using errcode='42501';
  end if;
  return new;
end $$;

revoke all on function private.autonomous_guard_advisory_agent_no_mutation() from public,anon,authenticated;
