-- TEST-only Hive safety patch. A timed-out lease may have completed inference remotely.
-- Never automatically replay it; require operator reconciliation instead.
-- No existing operational tables are changed and no historical rows are overwritten.
create or replace function public.hive_local_claim_job()
returns table(id uuid,lease text,prompt text,capability text,authorized boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.hive_local_inference_jobs%rowtype; l text;
begin
 if current_user <> 'postgres' and auth.role() is distinct from 'service_role' then
   raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 -- A RUNNING inference with an expired lease has unknown execution outcome.
 -- Preserve its lease hash for forensics and mark it non-claimable.
 update public.hive_local_inference_jobs q
 set status='FAILED',error_code='RECONCILIATION_REQUIRED',updated_at=now()
 where q.status='RUNNING' and q.lease_until<now();
 select * into j from public.hive_local_inference_jobs q
 where q.status='PENDING' and q.attempts<3
 order by q.created_at for update skip locked limit 1;
 if not found then return;end if;
 l=encode(extensions.gen_random_bytes(32),'hex');
 update public.hive_local_inference_jobs q set status='RUNNING',attempts=q.attempts+1,
 lease_token_hash=encode(extensions.digest(l,'sha256'),'hex'),
 lease_until=now()+interval '90 seconds',updated_at=now()
 where q.id=j.id;
 return query select j.id,l,j.prompt,'inference-only'::text,true;
end $$;
revoke all on function public.hive_local_claim_job() from public,anon,authenticated;
grant execute on function public.hive_local_claim_job() to service_role;
