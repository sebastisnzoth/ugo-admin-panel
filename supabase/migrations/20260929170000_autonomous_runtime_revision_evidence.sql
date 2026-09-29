-- Persist exact CI/runtime revision evidence for UGO TEST.
create table if not exists public.autonomous_runtime_revisions(
  id uuid primary key default gen_random_uuid(),
  workflow text not null,
  source_sha text not null check(source_sha ~ '^[0-9a-f]{40}$'),
  source_ref text,
  run_id text,
  run_attempt integer,
  environment text not null check(environment='UGO_TEST'),
  verification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workflow,source_sha,run_id,run_attempt)
);
alter table public.autonomous_runtime_revisions enable row level security;
revoke all on public.autonomous_runtime_revisions from public,anon,authenticated;
grant select,insert on public.autonomous_runtime_revisions to service_role;

create or replace function public.autonomous_record_runtime_revision(
 p_workflow text,p_source_sha text,p_source_ref text,p_run_id text,p_run_attempt integer,p_verification jsonb
)
returns public.autonomous_runtime_revisions
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare r public.autonomous_runtime_revisions%rowtype;
begin
 if p_source_sha !~ '^[0-9a-f]{40}$' then raise exception 'VALID_GITHUB_SHA_REQUIRED'; end if;
 if nullif(btrim(p_workflow),'') is null then raise exception 'WORKFLOW_REQUIRED'; end if;
 insert into public.autonomous_runtime_revisions(workflow,source_sha,source_ref,run_id,run_attempt,environment,verification)
 values(btrim(p_workflow),p_source_sha,nullif(btrim(p_source_ref),''),nullif(btrim(p_run_id),''),p_run_attempt,'UGO_TEST',coalesce(p_verification,'{}'::jsonb))
 on conflict(workflow,source_sha,run_id,run_attempt) do update
 set verification=excluded.verification,created_at=now()
 returning * into r;
 return r;
end$$;
revoke all on function public.autonomous_record_runtime_revision(text,text,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.autonomous_record_runtime_revision(text,text,text,text,integer,jsonb) to service_role;
