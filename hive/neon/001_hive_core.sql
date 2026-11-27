-- UGO Hive · esquema independiente para Neon TEST (proyecto `ugo-hive-test`, base `hive`).
--
-- ALCANCE: este archivo define EXCLUSIVAMENTE objetos del esquema `hive` en la base
-- independiente de Hive. No contiene una sola sentencia sobre tablas de UGO Arena, no
-- lee `usuarios`, `autonomous_jobs` ni ninguna otra tabla de Arena, y no debe aplicarse
-- a la base de Arena. No hay fallback: si falta Hive, Arena no consulta esto y este
-- esquema no consulta Arena.
--
-- IDEMPOTENTE: puede aplicarse N veces con el mismo resultado. Datos existentes se
-- conservan (inserts con ON CONFLICT DO UPDATE sólo sobre el catálogo documentado).
--
-- Aplicación (nunca pegando secretos en un chat ni en logs):
--   psql "$HIVE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f hive/neon/001_hive_core.sql
--
-- Rollback (seguro: sólo destruye objetos de este archivo, nunca datos de Arena):
--   drop schema if exists hive cascade;

begin;

create schema if not exists hive;
revoke all on schema hive from public;

-- ---------------------------------------------------------------------------
-- 1. Catálogo canónico de departamentos.
--    Datos de catálogo, no evidencia de ejecución: el canon de UGO es D1–D12 + D14
--    (no existe D13). Fuente: docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md §4–5.
-- ---------------------------------------------------------------------------
create table if not exists hive.departments (
  id    integer primary key,
  key   text not null unique,
  name  text not null,
  focus text not null
);

insert into hive.departments (id, key, name, focus) values
  ( 1, 'executive',  'Dirección ejecutiva', 'Estrategia y orquestación'),
  ( 2, 'operations', 'Operaciones',          'GPS, matching, despacho, recovery'),
  ( 3, 'clients',    'Clientes',             'Journey, soporte y retención'),
  ( 4, 'providers',  'Proveedores',          'Onboarding, supply, calidad'),
  ( 5, 'growth',     'Crecimiento',          'Captación y expansión'),
  ( 6, 'trust',      'Confianza',            'Disputas y fraude'),
  ( 7, 'finance',    'Finanzas',             'Conciliación, caja y deuda'),
  ( 8, 'technology', 'Tecnología',           'Ingeniería, seguridad y tools'),
  ( 9, 'qa',         'QA',                   'E2E, Judge, cobertura y regresión'),
  (10, 'legal',      'Legal',                'Políticas, privacidad y KYC'),
  (11, 'marketing',  'Marketing',            'Marca, contenido, localización'),
  (12, 'product',    'Producto',             'UX/UI, accesibilidad'),
  (14, 'audit',      'Auditoría',            'Gobernanza y controles')
on conflict (id) do update
  set key = excluded.key, name = excluded.name, focus = excluded.focus;

-- ---------------------------------------------------------------------------
-- 2. Registro de agentes: registrado ≠ conectado ≠ operativo.
--    `state` es la única fuente de verdad y sólo la escribe el operador de Hive.
--    Estar en esta tabla NO significa que el agente haya ejecutado nada.
-- ---------------------------------------------------------------------------
create table if not exists hive.agents (
  agent_key       text primary key,
  department_id   integer not null references hive.departments(id),
  name            text not null,
  state           text not null default 'REGISTERED'
                    check (state in ('REGISTERED','CONNECTED','OPERATIVE','DISABLED')),
  max_concurrency integer not null default 1 check (max_concurrency between 1 and 4),
  last_seen_at    timestamptz,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Configuración operativa con límites conservadores por defecto.
--    Sin telemetría fiable de cuotas se asume el mínimo, nunca el máximo.
-- ---------------------------------------------------------------------------
create table if not exists hive.settings (
  key   text primary key,
  value jsonb not null,
  note  text
);

insert into hive.settings (key, value, note) values
  ('max_concurrent_jobs',        '1'::jsonb,    'Arranque con un único agente activo; escalar sólo tras medir consumo.'),
  ('default_max_attempts',       '3'::jsonb,    'Sin reintentos infinitos.'),
  ('lease_seconds',              '120'::jsonb,  'Lease corto: si el worker muere, la tarea se recupera rápido.'),
  ('daily_calls_per_provider',   '20'::jsonb,   'Límite conservador diario por proveedor de IA.'),
  ('daily_tokens_per_provider',  '20000'::jsonb,'Límite conservador diario de tokens por proveedor.')
on conflict (key) do nothing;

create or replace function hive.setting_int(p_key text, p_default integer)
returns integer language sql stable set search_path = '' as $$
  select coalesce((select (value #>> '{}')::integer from hive.settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- 4. Cola persistente con reserva atómica.
-- ---------------------------------------------------------------------------
create table if not exists hive.jobs (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  department_id   integer not null references hive.departments(id),
  agent_key       text references hive.agents(agent_key),
  state           text not null default 'QUEUED'
                    check (state in ('QUEUED','LEASED','SUCCEEDED','FAILED','BLOCKED','CANCELLED')),
  priority        smallint not null default 100,
  attempts        integer not null default 0,
  max_attempts    integer not null default 3 check (max_attempts between 1 and 10),
  available_at    timestamptz not null default now(),
  lease_owner     text,
  lease_expires_at timestamptz,
  heartbeat_at    timestamptz,
  payload         jsonb not null default '{}'::jsonb,
  result          jsonb,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint hive_jobs_lease_consistency
    check (state <> 'LEASED' or (lease_owner is not null and lease_expires_at is not null)),
  constraint hive_jobs_attempts_bound check (attempts between 0 and max_attempts)
);

-- Índices mínimos y acotados: la reserva nunca escanea toda la cola.
create index if not exists hive_jobs_runnable
  on hive.jobs (priority, available_at, created_at) where state = 'QUEUED';
create index if not exists hive_jobs_live_leases
  on hive.jobs (lease_expires_at) where state = 'LEASED';
create index if not exists hive_jobs_agent_state
  on hive.jobs (agent_key, state);

-- Bitácora de Sentinel/Judge y de recuperación: append-only, sin borrados.
create table if not exists hive.job_events (
  id         bigserial primary key,
  job_id     uuid not null references hive.jobs(id) on delete cascade,
  event      text not null,
  actor      text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists hive_job_events_job on hive.job_events (job_id, id);

-- ---------------------------------------------------------------------------
-- 5. Consumo por proveedor y circuitos (control de presupuesto USD 0).
-- ---------------------------------------------------------------------------
create table if not exists hive.provider_daily_usage (
  provider text not null,
  day      date not null,
  calls    integer not null default 0 check (calls >= 0),
  tokens   bigint  not null default 0 check (tokens >= 0),
  primary key (provider, day)
);

create table if not exists hive.provider_circuits (
  provider      text primary key,
  failures      integer not null default 0 check (failures >= 0),
  blocked_until timestamptz
);

-- Escalera de cuotas. Devuelve el nivel y la acción exigida; si no hay telemetría
-- fiable del ciclo mensual, lo declara UNKNOWN en lugar de asumir salud.
create or replace function hive.quota_state(p_provider text, p_day date default (now() at time zone 'UTC')::date)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_calls integer; v_tokens bigint;
  v_limit_calls integer := hive.setting_int('daily_calls_per_provider', 20);
  v_limit_tokens bigint := hive.setting_int('daily_tokens_per_provider', 20000);
  v_pct numeric; v_level text; v_action text; v_allow boolean;
begin
  select calls, tokens into v_calls, v_tokens
    from hive.provider_daily_usage where provider = p_provider and day = p_day;
  v_calls := coalesce(v_calls, 0);
  v_tokens := coalesce(v_tokens, 0);
  v_pct := round(greatest(v_calls::numeric / greatest(v_limit_calls,1),
                          v_tokens::numeric / greatest(v_limit_tokens,1)) * 100, 2);
  if v_pct < 50  then v_level := 'NORMAL';   v_action := 'OPERAR';    v_allow := true;
  elsif v_pct < 70  then v_level := 'ALERT';    v_action := 'ADVERTIR';  v_allow := true;
  elsif v_pct < 85  then v_level := 'REDUCED';  v_action := 'REDUCIR';   v_allow := true;
  elsif v_pct < 95  then v_level := 'SUSPENDED';v_action := 'SUSPENDER'; v_allow := false;
  else                   v_level := 'BLOCKED';  v_action := 'BLOQUEAR';  v_allow := false;
  end if;
  return jsonb_build_object(
    'provider', p_provider, 'day', p_day, 'calls', v_calls, 'tokens', v_tokens,
    'daily_call_limit', v_limit_calls, 'daily_token_limit', v_limit_tokens,
    'percent_used', v_pct, 'level', v_level, 'action', v_action,
    'allow_new_secondary_tasks', v_allow,
    'monthly_quota', 'UNKNOWN');
end $$;

-- ---------------------------------------------------------------------------
-- 6. Operaciones de cola. Toda transición pasa por aquí: los workers no escriben
--    la tabla directamente (privilegios mínimos, ver §7).
-- ---------------------------------------------------------------------------

-- Encolado idempotente: la misma clave nunca crea dos tareas.
create or replace function hive.enqueue_job(
  p_idempotency_key text,
  p_department_id integer,
  p_agent_key text default null,
  p_priority smallint default 100,
  p_payload jsonb default '{}'::jsonb,
  p_available_at timestamptz default now(),
  p_max_attempts integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job hive.jobs%rowtype; v_new boolean := false;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  if p_department_id is null or not exists (select 1 from hive.departments where id = p_department_id) then
    raise exception 'INVALID_DEPARTMENT';
  end if;
  insert into hive.jobs (idempotency_key, department_id, agent_key, priority, payload, available_at, max_attempts)
  values (p_idempotency_key, p_department_id, p_agent_key, p_priority, coalesce(p_payload,'{}'::jsonb),
          coalesce(p_available_at, now()),
          coalesce(p_max_attempts, hive.setting_int('default_max_attempts', 3)))
  on conflict (idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from hive.jobs where idempotency_key = p_idempotency_key;
  else
    v_new := true;
    insert into hive.job_events (job_id, event, actor, detail)
    values (v_job.id, 'ENQUEUED', 'hive.enqueue_job', jsonb_build_object('department_id', p_department_id));
  end if;
  return jsonb_build_object(
    'accepted', true, 'deduplicated', not v_new,
    'job_id', v_job.id, 'state', v_job.state, 'attempts', v_job.attempts);
end $$;

-- Reserva atómica con concurrencia global acotada (arranque: un solo job a la vez).
create or replace function hive.reserve_job(p_worker text, p_lease_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_lease integer := coalesce(p_lease_seconds, hive.setting_int('lease_seconds', 120));
  v_max integer := hive.setting_int('max_concurrent_jobs', 1);
  v_live integer;
  v_job hive.jobs%rowtype;
begin
  if p_worker is null or length(trim(p_worker)) = 0 or length(p_worker) > 100 then
    raise exception 'INVALID_WORKER';
  end if;
  if v_lease < 30 or v_lease > 600 then raise exception 'INVALID_LEASE_SECONDS'; end if;

  -- Un único candado global serializa la comprobación de concurrencia y la toma.
  perform pg_catalog.pg_advisory_xact_lock(hashtext('ugo_hive_reserve_job'));

  select count(*) into v_live from hive.jobs
    where state = 'LEASED' and lease_expires_at > now();
  if v_live >= v_max then
    return jsonb_build_object('leased', false, 'code', 'CONCURRENCY_LIMIT',
      'live', v_live, 'max', v_max);
  end if;

  select * into v_job from hive.jobs
    where state = 'QUEUED' and available_at <= now()
    order by priority asc, available_at asc, created_at asc
    for update skip locked
    limit 1;

  if v_job.id is null then
    return jsonb_build_object('leased', false, 'code', 'QUEUE_EMPTY');
  end if;

  update hive.jobs
     set state = 'LEASED', lease_owner = trim(p_worker),
         lease_expires_at = now() + make_interval(secs => v_lease),
         heartbeat_at = now(), attempts = attempts + 1, updated_at = now()
   where id = v_job.id
   returning * into v_job;

  insert into hive.job_events (job_id, event, actor, detail)
  values (v_job.id, 'LEASED', trim(p_worker),
          jsonb_build_object('attempt', v_job.attempts, 'lease_seconds', v_lease));

  return jsonb_build_object('leased', true, 'code', 'LEASED', 'job', jsonb_build_object(
    'id', v_job.id, 'department_id', v_job.department_id, 'agent_key', v_job.agent_key,
    'attempt', v_job.attempts, 'max_attempts', v_job.max_attempts,
    'lease_expires_at', v_job.lease_expires_at, 'payload', v_job.payload));
end $$;

-- Latido: sólo el dueño con lease vigente puede extenderla.
create or replace function hive.heartbeat_job(p_job_id uuid, p_worker text, p_lease_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_lease integer := coalesce(p_lease_seconds, hive.setting_int('lease_seconds', 120));
  v_job hive.jobs%rowtype;
begin
  if v_lease < 30 or v_lease > 600 then raise exception 'INVALID_LEASE_SECONDS'; end if;
  update hive.jobs
     set lease_expires_at = now() + make_interval(secs => v_lease), heartbeat_at = now(), updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker) and lease_expires_at > now()
   returning * into v_job;
  if v_job.id is null then
    return jsonb_build_object('ok', false, 'code', 'LEASE_LOST');
  end if;
  return jsonb_build_object('ok', true, 'code', 'HEARTBEAT', 'lease_expires_at', v_job.lease_expires_at);
end $$;

create or replace function hive.complete_job(p_job_id uuid, p_worker text, p_result jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job hive.jobs%rowtype;
begin
  update hive.jobs
     set state = 'SUCCEEDED', result = coalesce(p_result,'{}'::jsonb),
         lease_owner = null, lease_expires_at = null, heartbeat_at = null,
         last_error = null, updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker) and lease_expires_at > now()
   returning * into v_job;
  if v_job.id is null then
    return jsonb_build_object('ok', false, 'code', 'LEASE_LOST');
  end if;
  insert into hive.job_events (job_id, event, actor) values (v_job.id, 'SUCCEEDED', trim(p_worker));
  return jsonb_build_object('ok', true, 'code', 'SUCCEEDED', 'attempts', v_job.attempts);
end $$;

-- Fallo con backoff exponencial acotado y jitter determinista (sin azar en tests).
create or replace function hive.fail_job(
  p_job_id uuid, p_worker text, p_error text, p_base_backoff_seconds integer default 30
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job hive.jobs%rowtype; v_delay numeric;
begin
  if p_base_backoff_seconds < 1 or p_base_backoff_seconds > 600 then raise exception 'INVALID_BACKOFF'; end if;
  update hive.jobs set state = 'FAILED', lease_owner = null, lease_expires_at = null,
         heartbeat_at = null, last_error = left(coalesce(p_error,'UNKNOWN'), 500), updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker)
     and attempts >= max_attempts
   returning * into v_job;
  if v_job.id is not null then
    insert into hive.job_events (job_id, event, actor, detail)
    values (v_job.id, 'FAILED', trim(p_worker),
            jsonb_build_object('attempts', v_job.attempts, 'error', v_job.last_error));
    return jsonb_build_object('ok', true, 'code', 'FAILED_FINAL', 'attempts', v_job.attempts);
  end if;

  -- Retry: el retraso crece con el intento, acotado a 1 hora, con jitter 0.5–1.5.
  v_delay := least(3600, p_base_backoff_seconds * power(2, greatest(0, (select attempts - 1 from hive.jobs where id = p_job_id))))
             * (0.5 + (abs(hashtext(p_job_id::text)) % 1000) / 1000.0);
  update hive.jobs
     set state = 'QUEUED', available_at = now() + make_interval(secs => v_delay),
         lease_owner = null, lease_expires_at = null, heartbeat_at = null,
         last_error = left(coalesce(p_error,'UNKNOWN'), 500), updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker)
   returning * into v_job;
  if v_job.id is null then
    return jsonb_build_object('ok', false, 'code', 'LEASE_LOST');
  end if;
  insert into hive.job_events (job_id, event, actor, detail)
  values (v_job.id, 'RETRY_SCHEDULED', trim(p_worker),
          jsonb_build_object('attempts', v_job.attempts, 'delay_seconds', round(v_delay), 'error', v_job.last_error));
  return jsonb_build_object('ok', true, 'code', 'RETRY_SCHEDULED', 'attempts', v_job.attempts,
                            'delay_seconds', round(v_delay));
end $$;

-- Recuperación de tareas interrumpidas: un lease vencido no pierde trabajo ni lo
-- duplica. Reencola con backoff o lo cierra como fallido si agotó los intentos.
create or replace function hive.recover_expired_leases(p_limit integer default 50, p_base_backoff_seconds integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row record; v_requeued integer := 0; v_failed integer := 0; v_delay numeric;
begin
  if p_limit < 1 or p_limit > 500 then raise exception 'INVALID_LIMIT'; end if;
  for v_row in
    select id, attempts, max_attempts from hive.jobs
     where state = 'LEASED' and lease_expires_at < now()
     order by lease_expires_at asc
     limit p_limit
     for update skip locked
  loop
    if v_row.attempts >= v_row.max_attempts then
      update hive.jobs set state = 'FAILED', lease_owner = null, lease_expires_at = null,
             heartbeat_at = null, last_error = 'LEASE_EXPIRED_MAX_ATTEMPTS', updated_at = now()
       where id = v_row.id;
      insert into hive.job_events (job_id, event, actor, detail)
      values (v_row.id, 'LEASE_EXPIRED_FAILED', 'hive.recover_expired_leases',
              jsonb_build_object('attempts', v_row.attempts));
      v_failed := v_failed + 1;
    else
      v_delay := least(3600, p_base_backoff_seconds * power(2, greatest(0, v_row.attempts - 1)))
                 * (0.5 + (abs(hashtext(v_row.id::text)) % 1000) / 1000.0);
      update hive.jobs set state = 'QUEUED', available_at = now() + make_interval(secs => v_delay),
             lease_owner = null, lease_expires_at = null, heartbeat_at = null,
             last_error = 'LEASE_EXPIRED', updated_at = now()
       where id = v_row.id;
      insert into hive.job_events (job_id, event, actor, detail)
      values (v_row.id, 'LEASE_RECOVERED', 'hive.recover_expired_leases',
              jsonb_build_object('attempts', v_row.attempts, 'delay_seconds', round(v_delay)));
      v_requeued := v_requeued + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'requeued', v_requeued, 'failed', v_failed);
end $$;

-- Registro de consumo de una llamada a proveedor, con corte por cuota.
create or replace function hive.record_provider_call(
  p_provider text, p_calls integer default 1, p_tokens bigint default 0
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'UTC')::date; v_state jsonb;
begin
  insert into hive.provider_daily_usage (provider, day, calls, tokens)
  values (p_provider, v_day, greatest(p_calls,0), greatest(p_tokens,0))
  on conflict (provider, day) do update
    set calls = hive.provider_daily_usage.calls + greatest(p_calls,0),
        tokens = hive.provider_daily_usage.tokens + greatest(p_tokens,0);
  v_state := hive.quota_state(p_provider, v_day);
  if not (v_state ->> 'allow_new_secondary_tasks')::boolean then
    update hive.provider_circuits
       set failures = failures + 1, blocked_until = now() + make_interval(secs => 300)
     where provider = p_provider;
    if not found then
      insert into hive.provider_circuits (provider, failures, blocked_until)
      values (p_provider, 1, now() + make_interval(secs => 300));
    end if;
  end if;
  return v_state;
end $$;

-- Métricas reales para la consola (nunca inventadas en el cliente).
create or replace function hive.queue_metrics()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'queued',   (select count(*) from hive.jobs where state = 'QUEUED'),
    'leased',   (select count(*) from hive.jobs where state = 'LEASED'),
    'succeeded',(select count(*) from hive.jobs where state = 'SUCCEEDED'),
    'failed',   (select count(*) from hive.jobs where state = 'FAILED'),
    'stale_leases', (select count(*) from hive.jobs where state = 'LEASED' and lease_expires_at < now()),
    'agents_registered', (select count(*) from hive.agents),
    'agents_connected',  (select count(*) from hive.agents where state = 'CONNECTED'),
    'agents_operative',  (select count(*) from hive.agents where state = 'OPERATIVE'),
    'agents_disabled',   (select count(*) from hive.agents where state = 'DISABLED'));
$$;

-- ---------------------------------------------------------------------------
-- 7. Privilegios mínimos. Ningún worker recibe escritura directa ni DDL.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hive_worker') then
    create role hive_worker nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'hive_reader') then
    create role hive_reader nologin;
  end if;
end $$;

grant usage on schema hive to hive_worker, hive_reader;

revoke all on all tables in schema hive from hive_worker, hive_reader;
-- Postgres grants EXECUTE on new functions to PUBLIC by default; withdraw it so
-- only the roles granted below can reach the queue operations.
revoke all on all functions in schema hive from public;
grant select on hive.departments, hive.agents, hive.settings,
                 hive.jobs, hive.job_events, hive.provider_daily_usage, hive.provider_circuits
  to hive_reader;
grant select on hive.departments, hive.agents, hive.settings,
                 hive.jobs, hive.job_events, hive.provider_daily_usage, hive.provider_circuits
  to hive_worker;

revoke all on function hive.quota_state(text, date) from public;
revoke all on function hive.setting_int(text, integer) from public;
grant execute on function hive.quota_state(text, date) to hive_worker, hive_reader;
grant execute on function hive.enqueue_job(text, integer, text, smallint, jsonb, timestamptz, integer) to hive_worker;
grant execute on function hive.reserve_job(text, integer) to hive_worker;
grant execute on function hive.heartbeat_job(uuid, text, integer) to hive_worker;
grant execute on function hive.complete_job(uuid, text, jsonb) to hive_worker;
grant execute on function hive.fail_job(uuid, text, text, integer) to hive_worker;
grant execute on function hive.recover_expired_leases(integer, integer) to hive_worker;
grant execute on function hive.record_provider_call(text, integer, bigint) to hive_worker;
grant execute on function hive.queue_metrics() to hive_worker, hive_reader;

commit;
