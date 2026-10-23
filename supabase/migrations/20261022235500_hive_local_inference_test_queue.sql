-- TEST-only Hive inference queue. No grants to anon/authenticated. Admin auth is enforced in Edge.
create table if not exists public.hive_local_inference_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 prompt text not null check (length(trim(prompt)) between 1 and 4000),
 status text not null default 'PENDING' check(status in ('PENDING','RUNNING','SUCCEEDED','FAILED')),
 idempotency_key uuid not null,
 attempts integer not null default 0 check(attempts between 0 and 3),
 lease_token_hash text,
 lease_until timestamptz,
 answer text,
 model text,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key),
 constraint hive_answer_length check (answer is null or length(answer)<=12000)
);
create index if not exists hive_local_jobs_claim on public.hive_local_inference_jobs(status, created_at);
alter table public.hive_local_inference_jobs enable row level security;
revoke all on public.hive_local_inference_jobs from public,anon,authenticated;
-- Provision only SHA256 of a generated Mac-side credential, never plaintext, through a controlled admin operation.
create table if not exists public.hive_local_worker_credentials (
 id integer primary key check(id=1),
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 active boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.hive_local_worker_credentials enable row level security;
revoke all on public.hive_local_worker_credentials from public,anon,authenticated;
create or replace function public.hive_local_claim_job()
returns table(id uuid,lease text,prompt text,capability text,authorized boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.hive_local_inference_jobs%rowtype; l text;
begin
 if current_user <> 'postgres' and auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='42501';end if;
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
create or replace function public.hive_local_complete_job(p_id uuid,p_lease text,p_status text,p_answer text,p_model text,p_code text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if current_user <> 'postgres' and auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if p_status not in ('SUCCEEDED','FAILED') or length(p_lease)<32 or
    (p_status='SUCCEEDED' and (coalesce(length(trim(p_answer)),0)=0 or length(p_answer)>12000 or p_model<>'qwen3-coder-free'))
 then return false;end if;
 update public.hive_local_inference_jobs set status=p_status,answer=case when p_status='SUCCEEDED' then p_answer else null end,
 model=case when p_status='SUCCEEDED' then p_model else null end,error_code=case when p_status='FAILED' then left(p_code,80) else null end,
 lease_until=null,lease_token_hash=null,updated_at=now()
 where id=p_id and status='RUNNING' and lease_until>now()
 and lease_token_hash=encode(extensions.digest(p_lease,'sha256'),'hex');
 return found;
end $$;
revoke all on function public.hive_local_claim_job() from public,anon,authenticated;
revoke all on function public.hive_local_complete_job(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.hive_local_claim_job() to service_role;
grant execute on function public.hive_local_complete_job(uuid,text,text,text,text,text) to service_role;
