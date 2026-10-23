alter table public.hive_local_worker_credentials add column if not exists last_seen_at timestamptz;
create or replace function public.hive_local_claim_job()
returns table(id uuid,lease text,prompt text,capability text,authorized boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.hive_local_inference_jobs%rowtype; l text;
begin
 if current_user <> 'postgres' and auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='42501';end if;
 update public.hive_local_inference_jobs q
 set status='FAILED',error_code='RETRY_EXHAUSTED',lease_until=null,lease_token_hash=null,updated_at=now()
 where q.status='RUNNING' and q.lease_until<now() and q.attempts>=3;
 select * into j from public.hive_local_inference_jobs q
 where (q.status='PENDING' or (q.status='RUNNING' and q.lease_until<now()))
 and q.attempts<3 order by q.created_at for update skip locked limit 1;
 if not found then return;end if;
 l=encode(extensions.gen_random_bytes(32),'hex');
 update public.hive_local_inference_jobs q set status='RUNNING',attempts=q.attempts+1,
 lease_token_hash=encode(extensions.digest(l,'sha256'),'hex'),lease_until=now()+interval '90 seconds',updated_at=now()
 where q.id=j.id;
 return query select j.id,l,j.prompt,'inference-only'::text,true;
end $$;
revoke all on function public.hive_local_claim_job() from public,anon,authenticated;
grant execute on function public.hive_local_claim_job() to service_role;