-- Preparation only: never apply remotely without approval. No scheduler/jobs are created.
create schema if not exists private;
create table public.hive_model_reservations (
  request_id uuid primary key,
  actor_id uuid not null references public.usuarios(id),
  mission_id uuid not null references public.autonomous_jobs(id),
  provider text not null check (provider in ('freellmapi','openrouter')),
  day date not null default (now() at time zone 'UTC')::date,
  tokens integer not null check (tokens between 1 and 2048),
  state text not null default 'RESERVED' check (state in ('RESERVED','SUCCEEDED','FAILED')),
  created_at timestamptz not null default now()
);
create index hive_reservations_day on public.hive_model_reservations(day);
alter table public.hive_model_reservations enable row level security;
revoke all on public.hive_model_reservations from public, anon, authenticated;
grant select, insert, update on public.hive_model_reservations to service_role;

create table public.hive_provider_circuits (
  provider text primary key check(provider in ('freellmapi','openrouter')),
  failures integer not null default 0,
  blocked_until timestamptz
);
alter table public.hive_provider_circuits enable row level security;
revoke all on public.hive_provider_circuits from public, anon, authenticated;
grant select, insert, update on public.hive_provider_circuits to service_role;

create function public.hive_reserve_model_call(p_request uuid,p_actor uuid,p_mission uuid,p_provider text,p_tokens integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare d date := (now() at time zone 'UTC')::date; old public.hive_model_reservations%rowtype;
begin
  if p_request is null or p_tokens is null or p_tokens < 1 or p_tokens > 2048 or p_provider is null or p_provider not in ('freellmapi','openrouter') then
    raise exception 'INVALID_RESERVATION';
  end if;
  -- A single global transaction lock protects every dimension and both providers.
  perform pg_catalog.pg_advisory_xact_lock(51520261018);
  if not exists(select 1 from public.usuarios where id=p_actor and activo=true and lower(tipo::text)='superadmin') then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;
  if not exists(select 1 from public.autonomous_jobs where id=p_mission and created_by=p_actor and status='RUNNING') then
    raise exception 'AUTHORIZED_JOB_REQUIRED' using errcode='42501';
  end if;
  select * into old from public.hive_model_reservations where request_id=p_request;
  if found then
    if old.actor_id<>p_actor or old.mission_id<>p_mission or old.provider<>p_provider or old.tokens<>p_tokens then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('allowed',false,'code','REQUEST_ALREADY_RESERVED');
  end if;
  if exists(select 1 from public.hive_provider_circuits where provider=p_provider and blocked_until>now()) then
    return jsonb_build_object('allowed',false,'code','CIRCUIT_OPEN');
  end if;
  if (select count(*) from public.hive_model_reservations where day=d)>=20
    or (select count(*) from public.hive_model_reservations where day=d and actor_id=p_actor)>=10
    or (select count(*) from public.hive_model_reservations where mission_id=p_mission)>=5
    or (select count(*) from public.hive_model_reservations where day=d and provider=p_provider)>=15
    or (select coalesce(sum(tokens),0) from public.hive_model_reservations where day=d)+p_tokens>20000 then
    return jsonb_build_object('allowed',false,'code','GLOBAL_QUOTA_EXHAUSTED');
  end if;
  insert into public.hive_model_reservations(request_id,actor_id,mission_id,provider,tokens)
    values(p_request,p_actor,p_mission,p_provider,p_tokens);
  return jsonb_build_object('allowed',true,'code','RESERVED');
end $$;
revoke all on function public.hive_reserve_model_call(uuid,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.hive_reserve_model_call(uuid,uuid,uuid,text,integer) to service_role;

create function public.hive_finish_model_call(p_request uuid,p_ok boolean,p_retry_seconds integer default 0)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.hive_model_reservations%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(51520261018);
  update public.hive_model_reservations set state=case when p_ok then 'SUCCEEDED' else 'FAILED' end
    where request_id=p_request and state='RESERVED' returning * into r;
  if not found then return; end if;
  insert into public.hive_provider_circuits(provider,failures,blocked_until)
    values(r.provider,case when p_ok then 0 else 1 end,
      case when not p_ok and p_retry_seconds>0 then now()+make_interval(secs=>least(p_retry_seconds,300)) end)
  on conflict(provider) do update set
    failures=case when p_ok then 0 else public.hive_provider_circuits.failures+1 end,
    blocked_until=case when p_ok then null
      when public.hive_provider_circuits.failures>=2 or p_retry_seconds>0 then now()+make_interval(secs=>greatest(30,least(coalesce(p_retry_seconds,0),300)))
      else public.hive_provider_circuits.blocked_until end;
end $$;
revoke all on function public.hive_finish_model_call(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.hive_finish_model_call(uuid,boolean,integer) to service_role;

-- Storage holds immutable encrypted blobs; this table is the transactional pointer.
create table public.hive_backup_versions (
  version uuid primary key,
  object_key text not null unique check(object_key ~ '^snapshots/[0-9a-f-]{36}$'),
  sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  bytes integer not null check(bytes between 37 and 8388608),
  sequence bigint generated always as identity unique,
  created_at timestamptz not null default now()
);
alter table public.hive_backup_versions enable row level security;
revoke all on public.hive_backup_versions from public,anon,authenticated;
grant select,insert,delete on public.hive_backup_versions to service_role;
grant usage,select on sequence public.hive_backup_versions_sequence_seq to service_role;
-- Durable retry queue for failed deletes and uploads with an unknown commit outcome.
-- Bound pending uploads before accepting any additional Storage bytes.
create table public.hive_backup_cleanup (
 object_key text primary key check(object_key ~ '^snapshots/[0-9a-f-]{36}$'),
 not_before timestamptz not null default now()+interval '1 hour'
);
alter table public.hive_backup_cleanup enable row level security;
revoke all on public.hive_backup_cleanup from public,anon,authenticated;
grant select,insert,delete on public.hive_backup_cleanup to service_role;
create function public.hive_stage_backup(p_version uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(51520261019);
 if (select count(*) from public.hive_backup_cleanup)>=32 then return false; end if;
 insert into public.hive_backup_cleanup(object_key) values('snapshots/'||p_version);
 return true;
end $$;
revoke all on function public.hive_stage_backup(uuid) from public,anon,authenticated;
grant execute on function public.hive_stage_backup(uuid) to service_role;

create function public.hive_commit_backup(p_expected uuid,p_version uuid,p_sha text,p_bytes integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_version uuid; garbage text[];
begin
  perform pg_catalog.pg_advisory_xact_lock(51520261019);
  if current_setting('transaction_isolation')<>'read committed' then raise exception 'READ_COMMITTED_REQUIRED'; end if;
  if not exists(select 1 from public.hive_backup_cleanup where object_key='snapshots/'||p_version and not_before>pg_catalog.clock_timestamp()) then
    return jsonb_build_object('ok',false,'code','UPLOAD_STAGE_EXPIRED');
  end if;
  select version into current_version from public.hive_backup_versions order by sequence desc limit 1;
  if current_version is distinct from p_expected then return jsonb_build_object('ok',false,'code','STALE_BACKUP'); end if;
  if p_version is null or p_version=p_expected then raise exception 'INVALID_VERSION'; end if;
  insert into public.hive_backup_versions(version,object_key,sha256,bytes)
    values(p_version,'snapshots/'||p_version,p_sha,p_bytes);
  with deleted as (delete from public.hive_backup_versions where sequence not in
    (select sequence from public.hive_backup_versions order by sequence desc limit 3) returning object_key)
    select coalesce(array_agg(object_key),'{}') into garbage from deleted;
  delete from public.hive_backup_cleanup where object_key='snapshots/'||p_version;
  insert into public.hive_backup_cleanup(object_key) select unnest(garbage) on conflict do nothing;
  return jsonb_build_object('ok',true,'version',p_version,'garbage',garbage);
end $$;
revoke all on function public.hive_commit_backup(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.hive_commit_backup(uuid,uuid,text,integer) to service_role;

-- Serialize cleanup selection with commits. An already committing upload finishes
-- before this SELECT; a selected expired stage can never be committed afterwards.
create function public.hive_claim_backup_cleanup() returns setof text
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(51520261019);
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'READ_COMMITTED_REQUIRED'; end if;
 return query select q.object_key from public.hive_backup_cleanup q
 where q.not_before<=pg_catalog.clock_timestamp()
 and not exists(select 1 from public.hive_backup_versions v where v.object_key=q.object_key)
 order by q.not_before limit 32;
end $$;
revoke all on function public.hive_claim_backup_cleanup() from public,anon,authenticated;
grant execute on function public.hive_claim_backup_cleanup() to service_role;
