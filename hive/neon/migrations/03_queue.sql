-- UGO Hive · 03 · Cola persistente con fencing tokens.
--
-- NO ASUME BASE VACÍA: crea la tabla si no existe y, si `hive.jobs` ya existe con otro
-- diseño, **añade** las columnas que falten sin borrar ni reescribir nada. Nunca se
-- elimina una columna, una fila ni un índice ajeno.
--
-- `lease_token` es el fencing token: se incrementa en cada concesión de lease y toda
-- transición (heartbeat/complete/fail) exige el token vigente. Un worker con un token
-- obsoleto no puede cerrar un trabajo que ya pertenece a otro: evita la doble
-- finalización sin prometer ejecución exactamente una vez (ver 04_job_effects).

create table if not exists hive.jobs (
  id               uuid primary key default gen_random_uuid(),
  idempotency_key  text not null,
  department_id    integer not null,
  agent_key        text,
  state            text not null default 'QUEUED',
  priority         smallint not null default 100,
  attempts         integer not null default 0,
  max_attempts     integer not null default 3,
  available_at     timestamptz not null default now(),
  lease_owner      text,
  lease_token      bigint not null default 0,
  lease_expires_at timestamptz,
  heartbeat_at     timestamptz,
  payload          jsonb not null default '{}'::jsonb,
  result           jsonb,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table hive.jobs add column if not exists idempotency_key  text;
alter table hive.jobs add column if not exists department_id    integer;
alter table hive.jobs add column if not exists agent_key        text;
alter table hive.jobs add column if not exists state            text not null default 'QUEUED';
alter table hive.jobs add column if not exists priority         smallint not null default 100;
alter table hive.jobs add column if not exists attempts         integer not null default 0;
alter table hive.jobs add column if not exists max_attempts     integer not null default 3;
alter table hive.jobs add column if not exists available_at     timestamptz not null default now();
alter table hive.jobs add column if not exists lease_owner      text;
alter table hive.jobs add column if not exists lease_token      bigint not null default 0;
alter table hive.jobs add column if not exists lease_expires_at timestamptz;
alter table hive.jobs add column if not exists heartbeat_at     timestamptz;
alter table hive.jobs add column if not exists payload          jsonb not null default '{}'::jsonb;
alter table hive.jobs add column if not exists result           jsonb;
alter table hive.jobs add column if not exists last_error       text;
alter table hive.jobs add column if not exists created_at       timestamptz not null default now();
alter table hive.jobs add column if not exists updated_at       timestamptz not null default now();

-- La idempotencia exige clave única. Si ya hay duplicados, se aborta informando:
-- decidir qué hacer con esos registros es del operador, nunca del script.
do $$
declare v_dups integer; v_nulls integer;
begin
  if not exists (select 1 from pg_indexes where schemaname = 'hive' and indexname = 'hive_jobs_idempotency_key_uidx') then
    select count(*) into v_dups from (
      select idempotency_key from hive.jobs where idempotency_key is not null
       group by idempotency_key having count(*) > 1) d;
    if v_dups > 0 then
      raise exception 'IDEMPOTENCY_KEYS_DUPLICATED: % claves repetidas en hive.jobs; resolver manualmente (no se borra nada)', v_dups;
    end if;
    begin
      create unique index hive_jobs_idempotency_key_uidx on hive.jobs (idempotency_key);
    exception when others then
      raise exception 'IDEMPOTENCY_INDEX_FAILED: %', sqlerrm;
    end;
  end if;
  select count(*) into v_nulls from hive.jobs where idempotency_key is null;
  if v_nulls > 0 then
    raise warning 'hive.jobs tiene % filas sin idempotency_key; se conservan y quedan excluidas de la reserva', v_nulls;
  end if;
end $$;

create index if not exists hive_jobs_runnable
  on hive.jobs (priority, available_at, created_at) where state = 'QUEUED';
create index if not exists hive_jobs_live_leases
  on hive.jobs (lease_expires_at) where state = 'LEASED';
create index if not exists hive_jobs_agent_state
  on hive.jobs (agent_key, state);

create table if not exists hive.job_events (
  id         bigserial primary key,
  job_id     uuid not null,
  event      text not null,
  actor      text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists hive_job_events_job on hive.job_events (job_id, id);
