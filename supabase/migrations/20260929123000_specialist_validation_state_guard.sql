-- Keep D9 specialist validators non-operational until full validation promotes them.
-- Validation remains service-role-only; operational execution stays disabled.
update public.autonomous_agents set status='DISABLED',updated_at=now()
where department_id=9 and agent_key in ('regression-agent','release-gate-agent') and status='IDLE';

create or replace function public.autonomous_validate_specialist(p_agent_key text)
returns jsonb language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare a public.autonomous_agents%rowtype;
begin
 if p_agent_key not in ('regression-agent','release-gate-agent') then raise exception 'SPECIALIST_NOT_VALIDATABLE'; end if;
 select * into a from public.autonomous_agents where department_id=9 and agent_key=p_agent_key;
 if a.id is null then raise exception 'SPECIALIST_NOT_FOUND'; end if;
 if a.status<>'DISABLED' then raise exception 'SPECIALIST_MUST_REMAIN_DISABLED_DURING_VALIDATION'; end if;
 return jsonb_build_object('agent_id',a.id,'agent_key',a.agent_key,'status',a.status,'authority_class',a.authority_class,'validation_only',true);
end$$;
revoke all on function public.autonomous_validate_specialist(text) from public,anon,authenticated;
grant execute on function public.autonomous_validate_specialist(text) to service_role;
