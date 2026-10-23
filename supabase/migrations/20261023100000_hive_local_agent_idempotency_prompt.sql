-- UGO Hive TEST only: an idempotency key must not silently reuse a different prompt.
-- The agent-aware RPC replaces only the isolated Hive function; no historical job is rewritten.
create or replace function public.hive_local_create_agent_job(
 p_user_id uuid,p_prompt text,p_key uuid,p_agent text
) returns table(id uuid,status text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.hive_local_inference_jobs%rowtype; recent int;
begin
 if current_user <> 'postgres' and auth.role() is distinct from 'service_role' then
  raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 if p_user_id is null or p_key is null or length(trim(coalesce(p_prompt,''))) not between 1 and 4000
    or p_agent is null or p_agent not in ('Hugo','Architect','Developer','QA','Security','DevOps','Judge','Sentinel','Research') then
  raise exception 'HIVE_INVALID_REQUEST' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtext(p_user_id::text));
 select * into j from public.hive_local_inference_jobs q where q.user_id=p_user_id and q.idempotency_key=p_key;
 if found then
  if j.agent_id is distinct from p_agent or j.prompt is distinct from p_prompt then
   raise exception 'HIVE_IDEMPOTENCY_CONFLICT' using errcode='22023';
  end if;
  return query select j.id,j.status;return;
 end if;
 select count(*) into recent from public.hive_local_inference_jobs q
 where q.user_id=p_user_id and q.created_at>now()-interval '60 seconds';
 if recent>=10 then raise exception 'HIVE_RATE_LIMITED' using errcode='P0001';end if;
 insert into public.hive_local_inference_jobs(user_id,prompt,idempotency_key,agent_id)
 values(p_user_id,p_prompt,p_key,p_agent) returning * into j;
 return query select j.id,j.status;
end $$;
revoke all on function public.hive_local_create_agent_job(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.hive_local_create_agent_job(uuid,text,uuid,text) to service_role;
