-- UGO Hive · 06 · Operaciones de cola.
--
-- Todas las mutaciones pasan por funciones SECURITY DEFINER con search_path vacío y
-- nombres calificados: los workers nunca reciben escritura directa ni DDL (ver 07_grants).
-- Cada transición exige el fencing token vigente.

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
  values (p_idempotency_key, p_department_id, p_agent_key, p_priority, coalesce(p_payload, '{}'::jsonb),
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
  return jsonb_build_object('accepted', true, 'deduplicated', not v_new, 'job_id', v_job.id,
                            'state', v_job.state, 'attempts', v_job.attempts);
end $$;

create or replace function hive.reserve_job(p_worker text, p_lease_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_lease integer := coalesce(p_lease_seconds, hive.setting_int('lease_seconds', 120));
  v_max integer := hive.setting_int('max_concurrent_jobs', 1);
  v_lock constant bigint := hashtext('ugo_hive_reserve_job');
  v_live integer;
  v_job hive.jobs%rowtype;
begin
  if p_worker is null or length(trim(p_worker)) = 0 or length(p_worker) > 100 then
    raise exception 'INVALID_WORKER';
  end if;
  if v_lease < 30 or v_lease > 600 then raise exception 'INVALID_LEASE_SECONDS'; end if;

  -- El recuento de leases sólo ve filas CONFIRMADAS, así que dos reservas simultáneas
  -- podrían sobre-conceder si no se serializan. Se serializan con un candado de
  -- transacción, pero con `try`: si otra reserva está en curso, se responde
  -- RESERVE_BUSY de inmediato en lugar de bloquear. Contrato del worker:
  --   1) reservar en su PROPIA transacción corta (no mantenerla abierta mientras trabaja);
  --   2) ante RESERVE_BUSY, reintentar con backoff acotado + jitter, nunca en bucle cerrado.
  if not pg_try_advisory_xact_lock(v_lock) then
    return jsonb_build_object('leased', false, 'code', 'RESERVE_BUSY');
  end if;

  select count(*) into v_live from hive.jobs where state = 'LEASED' and lease_expires_at > now();
  if v_live >= v_max then
    return jsonb_build_object('leased', false, 'code', 'CONCURRENCY_LIMIT', 'live', v_live, 'max', v_max);
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
     set state = 'LEASED', lease_owner = trim(p_worker), lease_token = lease_token + 1,
         lease_expires_at = now() + make_interval(secs => v_lease),
         heartbeat_at = now(), attempts = attempts + 1, updated_at = now()
   where id = v_job.id
   returning * into v_job;

  insert into hive.job_events (job_id, event, actor, detail)
  values (v_job.id, 'LEASED', trim(p_worker),
          jsonb_build_object('attempt', v_job.attempts, 'lease_seconds', v_lease, 'lease_token', v_job.lease_token));

  return jsonb_build_object('leased', true, 'code', 'LEASED', 'lease_token', v_job.lease_token,
    'job', jsonb_build_object('id', v_job.id, 'department_id', v_job.department_id, 'agent_key', v_job.agent_key,
      'attempt', v_job.attempts, 'max_attempts', v_job.max_attempts,
      'lease_expires_at', v_job.lease_expires_at, 'lease_token', v_job.lease_token, 'payload', v_job.payload));
end $$;

create or replace function hive.heartbeat_job(p_job_id uuid, p_worker text, p_token bigint, p_lease_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_lease integer := coalesce(p_lease_seconds, hive.setting_int('lease_seconds', 120)); v_job hive.jobs%rowtype;
begin
  if v_lease < 30 or v_lease > 600 then raise exception 'INVALID_LEASE_SECONDS'; end if;
  update hive.jobs
     set lease_expires_at = now() + make_interval(secs => v_lease), heartbeat_at = now(), updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker)
     and lease_token = p_token and lease_expires_at > now()
   returning * into v_job;
  if v_job.id is null then return jsonb_build_object('ok', false, 'code', 'LEASE_LOST'); end if;
  return jsonb_build_object('ok', true, 'code', 'HEARTBEAT', 'lease_expires_at', v_job.lease_expires_at,
                            'lease_token', v_job.lease_token);
end $$;

-- Cierre con efecto idempotente: informa si el efecto se aplicó por primera vez.
create or replace function hive.complete_job(
  p_job_id uuid, p_worker text, p_token bigint,
  p_result jsonb default '{}'::jsonb, p_effect_key text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job hive.jobs%rowtype; v_effect boolean := null;
begin
  update hive.jobs
     set state = 'SUCCEEDED', result = coalesce(p_result, '{}'::jsonb),
         lease_owner = null, lease_expires_at = null, heartbeat_at = null,
         last_error = null, updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker)
     and lease_token = p_token and lease_expires_at > now()
   returning * into v_job;
  if v_job.id is null then
    return jsonb_build_object('ok', false, 'code', 'LEASE_LOST');
  end if;
  if p_effect_key is not null then
    insert into hive.job_effects (effect_key, job_id, detail)
    values (p_effect_key, p_job_id, coalesce(p_result, '{}'::jsonb))
    on conflict (effect_key) do nothing;
    v_effect := found;
  end if;
  insert into hive.job_events (job_id, event, actor, detail)
  values (v_job.id, 'SUCCEEDED', trim(p_worker),
          jsonb_build_object('effect_key', p_effect_key, 'effect_applied', v_effect));
  -- at_least_once: el trabajo puede haberse ejecutado más de una vez; el efecto no.
  return jsonb_build_object('ok', true, 'code', 'SUCCEEDED', 'attempts', v_job.attempts,
                            'lease_token', v_job.lease_token, 'effect_applied', v_effect, 'execution', 'at_least_once');
end $$;

create or replace function hive.fail_job(
  p_job_id uuid, p_worker text, p_token bigint, p_error text, p_base_backoff_seconds integer default 30
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job hive.jobs%rowtype; v_delay numeric;
begin
  if p_base_backoff_seconds < 1 or p_base_backoff_seconds > 600 then raise exception 'INVALID_BACKOFF'; end if;
  update hive.jobs
     set state = 'FAILED', lease_owner = null, lease_expires_at = null, heartbeat_at = null,
         last_error = left(coalesce(p_error, 'UNKNOWN'), 500), updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker)
     and lease_token = p_token and attempts >= max_attempts
   returning * into v_job;
  if v_job.id is not null then
    insert into hive.job_events (job_id, event, actor, detail)
    values (v_job.id, 'FAILED', trim(p_worker), jsonb_build_object('attempts', v_job.attempts, 'error', v_job.last_error));
    return jsonb_build_object('ok', true, 'code', 'FAILED_FINAL', 'attempts', v_job.attempts);
  end if;

  v_delay := least(3600,
      p_base_backoff_seconds * power(2, greatest(0, coalesce((select attempts - 1 from hive.jobs where id = p_job_id), 0))))
    * (0.5 + (abs(hashtext(p_job_id::text)) % 1000) / 1000.0);

  update hive.jobs
     set state = 'QUEUED', available_at = now() + make_interval(secs => v_delay),
         lease_owner = null, lease_expires_at = null, heartbeat_at = null,
         last_error = left(coalesce(p_error, 'UNKNOWN'), 500), updated_at = now()
   where id = p_job_id and state = 'LEASED' and lease_owner = trim(p_worker) and lease_token = p_token
   returning * into v_job;
  if v_job.id is null then return jsonb_build_object('ok', false, 'code', 'LEASE_LOST'); end if;
  insert into hive.job_events (job_id, event, actor, detail)
  values (v_job.id, 'RETRY_SCHEDULED', trim(p_worker),
          jsonb_build_object('attempts', v_job.attempts, 'delay_seconds', round(v_delay), 'error', v_job.last_error));
  return jsonb_build_object('ok', true, 'code', 'RETRY_SCHEDULED', 'attempts', v_job.attempts, 'delay_seconds', round(v_delay));
end $$;

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
      values (v_row.id, 'LEASE_EXPIRED_FAILED', 'hive.recover_expired_leases', jsonb_build_object('attempts', v_row.attempts));
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

create or replace function hive.queue_metrics()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'queued',    (select count(*) from hive.jobs where state = 'QUEUED'),
    'leased',    (select count(*) from hive.jobs where state = 'LEASED'),
    'succeeded', (select count(*) from hive.jobs where state = 'SUCCEEDED'),
    'failed',    (select count(*) from hive.jobs where state = 'FAILED'),
    'stale_leases', (select count(*) from hive.jobs where state = 'LEASED' and lease_expires_at < now()),
    'effects_applied', (select count(*) from hive.job_effects),
    'agents_registered', (select count(*) from hive.agents where state = 'REGISTERED'),
    'agents_connected',  (select count(*) from hive.agents where state = 'CONNECTED'),
    'agents_operative',  (select count(*) from hive.agents where state = 'OPERATIVE'),
    'agents_disabled',   (select count(*) from hive.agents where state = 'DISABLED'));
$$;
