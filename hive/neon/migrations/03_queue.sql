-- UGO Hive · 03 · Cola de trabajos sobre el esquema REAL.
--
-- ESQUEMA REAL (verificado por ChatGPT en Neon, base `hive`):
--   hive.jobs(id uuid, idempotency_key text, agent_name text,
--             prompt text NOT NULL, status text, created_at timestamptz)
--   con 1 tarea finalizada y 0 pendientes.
--
-- RESTRICCIÓN REAL (verificada por ChatGPT):
--   jobs_status_check CHECK (status IN ('PENDING','RUNNING','DONE','FAILED'))
-- `status` NO admite 'queued'/'succeeded' ni minúsculas: la v2.1.0 escribía lower(state)
-- y habría violado la restricción. Aquí `state` es la verdad operativa y `status` es su
-- PROYECCIÓN sobre los cuatro valores reales, sin eliminar la restricción jamás:
--   QUEUED → PENDING · LEASED → RUNNING · SUCCEEDED → DONE · FAILED → FAILED
--   CANCELLED → DONE (proyección terminal) y su significado exacto permanece en `state`.
--
-- La primera versión asumía `state` y `payload` como columnas propias y habría re-encolado
-- la tarea finalizada. Aquí:
--   · `status` es la columna real y se refleja en `state` (y al revés);
--   · el valor original se conserva SIEMPRE en `legacy_status`;
--   · una tarea terminada (DONE/COMPLETED/FAILED/CANCELLED…) queda en estado terminal
--     y **jamás** se convierte en QUEUED;
--   · una tarea "en vuelo" de la que no consta dueño no se re-ejecuta a ciegas: queda
--     FAILED con last_error LEGACY_IN_FLIGHT_NEEDS_REVIEW para que decida un humano;
--   · `prompt` se respeta como NOT NULL y `agent_name` se mantiene enlazado a `agents.name`.

create table if not exists hive.jobs (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key text,
  agent_name      text,
  prompt          text not null,
  status          text,
  created_at      timestamptz not null default now()
);

-- Columnas nuevas (sólo se añaden; la tabla real no pierde nada).
-- `agent_name` y `created_at` forman parte del esquema real; en tablas de otro diseño
-- pueden faltar y se añaden (sin datos se quedan NULL, no se inventa nada).
alter table hive.jobs add column if not exists agent_name      text;
alter table hive.jobs add column if not exists created_at      timestamptz default now();
alter table hive.jobs add column if not exists state           text;
alter table hive.jobs add column if not exists agent_key       text;
alter table hive.jobs add column if not exists department_id   integer;
alter table hive.jobs add column if not exists priority        smallint default 5;
alter table hive.jobs add column if not exists payload         jsonb default '{}'::jsonb;
alter table hive.jobs add column if not exists result          jsonb;
alter table hive.jobs add column if not exists available_at    timestamptz;
alter table hive.jobs add column if not exists attempts        integer default 0;
alter table hive.jobs add column if not exists max_attempts    integer;
alter table hive.jobs add column if not exists lease_owner     text;
alter table hive.jobs add column if not exists lease_token     bigint default 0;
alter table hive.jobs add column if not exists lease_expires_at timestamptz;
alter table hive.jobs add column if not exists heartbeat_at    timestamptz;
alter table hive.jobs add column if not exists last_error      text;
alter table hive.jobs add column if not exists legacy_status   text;
alter table hive.jobs add column if not exists effect_key      text;
alter table hive.jobs add column if not exists finished_at     timestamptz;
alter table hive.jobs add column if not exists updated_at      timestamptz default now();

-- `prompt` es NOT NULL en la tabla real. Hay dos casos distintos y se tratan distinto:
--   · la columna no existe (tabla de otro diseño): se añade y las filas heredadas quedan
--     marcadas como `payload.legacy_no_prompt = true` — no se inventa contenido;
--   · la columna existe con nulos (la tabla real lo prohíbe): se aborta, hay corrupción.
do $$
declare v_had boolean;
begin
  select exists (select 1 from information_schema.columns
                  where table_schema = 'hive' and table_name = 'jobs' and column_name = 'prompt')
    into v_had;
  if not v_had then
    alter table hive.jobs add column prompt text;
    update hive.jobs set prompt = '[legacy] sin prompt registrado' where prompt is null;
    update hive.jobs set payload = coalesce(payload, '{}'::jsonb) || '{"legacy_no_prompt": true}'::jsonb
     where prompt = '[legacy] sin prompt registrado';
    raise notice 'HIVE_LEGACY: la tabla jobs no tenía prompt; % fila(s) marcadas como legacy_no_prompt',
      (select count(*) from hive.jobs where prompt = '[legacy] sin prompt registrado');
  end if;
  if exists (select 1 from hive.jobs where prompt is null) then
    raise exception 'PROMPT_NULLS_PRESENT: hay tareas con prompt nulo en una tabla que lo exige NOT NULL. Revisar antes de migrar, no se rellena solo';
  end if;
end $$;

-- Traducción de estado, con los valores terminados primero.
create or replace function hive.state_from_job_status(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case lower(coalesce(p_status, ''))
    when 'done'       then 'SUCCEEDED'
    when 'completed'  then 'SUCCEEDED'
    when 'succeeded'  then 'SUCCEEDED'
    when 'success'    then 'SUCCEEDED'
    when 'finished'   then 'SUCCEEDED'
    when 'failed'     then 'FAILED'
    when 'error'      then 'FAILED'
    when 'errored'    then 'FAILED'
    when 'cancelled'  then 'CANCELLED'
    when 'canceled'   then 'CANCELLED'
    when 'aborted'    then 'CANCELLED'
    when 'pending'    then 'QUEUED'
    when 'queued'     then 'QUEUED'
    when 'new'        then 'QUEUED'
    when 'todo'       then 'QUEUED'
    when 'leased'     then 'LEASED'
    when 'running'    then 'LEASED'
    when 'in_progress' then 'LEASED'
    when 'processing' then 'LEASED'
    else 'FAILED'
  end;
$$;

-- Proyección canónica de `state` sobre el dominio real de `status`.
create or replace function hive.status_for_state(p_state text)
returns text language sql immutable set search_path = '' as $$
  select case upper(coalesce(p_state, ''))
    when 'QUEUED'    then 'PENDING'
    when 'LEASED'    then 'RUNNING'
    when 'SUCCEEDED' then 'DONE'
    when 'FAILED'    then 'FAILED'
    when 'CANCELLED' then 'DONE'
    else 'FAILED'
  end;
$$;

-- El dominio real se lee de la base, no se supone. Si la restricción existente no admite
-- los cuatro valores canónicos, se aborta: no se elimina la restricción ni se inventan
-- valores para "que pase".
do $$
declare v_def text; v_allowed text[]; v_missing text;
begin
  select pg_get_constraintdef(c.oid) into v_def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'hive' and t.relname = 'jobs' and c.contype = 'c'
     and pg_get_constraintdef(c.oid) ilike '%status%'
   order by c.conname
   limit 1;

  if v_def is null then
    raise notice 'HIVE_STATUS_DOMAIN: no hay CHECK sobre status; se usa la proyección canónica PENDING/RUNNING/DONE/FAILED';
  else
    select array_agg(m[1]) into v_allowed from regexp_matches(v_def, '''([A-Za-z_]+)''', 'g') m;
    select string_agg(x, ', ') into v_missing
      from unnest(array['PENDING','RUNNING','DONE','FAILED']) x
     where not (x = any(coalesce(v_allowed, '{}')));
    if v_missing is not null then
      raise exception 'STATUS_DOMAIN_MISMATCH: la restricción real (%) no admite %. No se elimina ninguna restricción: revisar el mapeo antes de migrar.', v_def, v_missing;
    end if;
    raise notice 'HIVE_STATUS_DOMAIN: restricción real compatible (%), se conserva', v_def;
  end if;
end $$;

-- Conservar el status original y derivar `state` una sola vez.
update hive.jobs set legacy_status = coalesce(legacy_status, status)
 where legacy_status is null and status is not null;

update hive.jobs
   set state = case
         when state is not null then state
         when hive.state_from_job_status(status) = 'LEASED' then 'FAILED'
         else hive.state_from_job_status(status)
       end,
       last_error = case
         when state is null and hive.state_from_job_status(status) = 'LEASED'
              then 'LEGACY_IN_FLIGHT_NEEDS_REVIEW'
         when state is null and hive.state_from_job_status(status) = 'FAILED'
              and lower(coalesce(status,'')) not in ('failed','error','errored')
              then 'LEGACY_STATUS_UNMAPPED:' || coalesce(status, 'null')
         else last_error
       end
 where state is null;

-- Una tarea terminada nunca vuelve a la cola; coherencia explícita y comprobada.
update hive.jobs set finished_at = coalesce(finished_at, created_at, now())
 where state in ('SUCCEEDED', 'FAILED', 'CANCELLED') and finished_at is null;

update hive.jobs set available_at = coalesce(available_at, created_at, now())
 where available_at is null;
update hive.jobs set attempts      = coalesce(attempts, case when state = 'QUEUED' then 0 else 1 end);
update hive.jobs set max_attempts  = coalesce(max_attempts, hive.setting_int('default_max_attempts', 3));
update hive.jobs set priority      = coalesce(priority, 5);
update hive.jobs set payload       = coalesce(payload, '{}'::jsonb);
update hive.jobs set lease_token   = coalesce(lease_token, 0);
-- Proyección al dominio REAL (cuatro valores, mayúsculas). El valor original sigue en
-- `legacy_status`; una tarea CANCELLED queda con status DONE y state CANCELLED.
update hive.jobs set status = hive.status_for_state(state)
 where status is distinct from hive.status_for_state(state);
update hive.jobs set agent_key = hive.slug(a.name)
  from hive.agents a
 where hive.jobs.agent_key is null and hive.jobs.agent_name is not null and a.name = hive.jobs.agent_name;

-- Valores por defecto para que la herramienta real pueda seguir insertando filas
-- (idempotency_key, agent_name, prompt, status) sin conocer las columnas nuevas.
alter table hive.jobs alter column state        set default 'QUEUED';
alter table hive.jobs alter column available_at set default now();
alter table hive.jobs alter column attempts     set default 0;
alter table hive.jobs alter column max_attempts set default 3;
alter table hive.jobs alter column lease_token  set default 0;
alter table hive.jobs alter column payload      set default '{}'::jsonb;
alter table hive.jobs alter column priority     set default 5;
alter table hive.jobs alter column updated_at   set default now();
alter table hive.jobs alter column state        set not null;
alter table hive.jobs alter column available_at set not null;
alter table hive.jobs alter column attempts     set not null;
alter table hive.jobs alter column max_attempts set not null;
alter table hive.jobs alter column lease_token  set not null;

-- Duplicados de idempotencia: se aborta, no se borra.
do $$
declare v_dup text;
begin
  select string_agg(idempotency_key, ', ') into v_dup
    from (select idempotency_key from hive.jobs
           where idempotency_key is not null
           group by idempotency_key having count(*) > 1) d;
  if v_dup is not null then
    raise exception 'IDEMPOTENCY_KEYS_DUPLICATED: %; resolver a mano, no se borra nada', v_dup;
  end if;
end $$;
-- Un índice único normal ya permite varios NULL; así ON CONFLICT (idempotency_key)
-- puede inferirlo sin ambigüedad.
create unique index if not exists hive_jobs_idempotency_key on hive.jobs (idempotency_key);
create index if not exists hive_jobs_queue_order on hive.jobs (priority, available_at, created_at)
  where state = 'QUEUED';
create index if not exists hive_jobs_state        on hive.jobs (state);
create index if not exists hive_jobs_agent        on hive.jobs (agent_key);
create index if not exists hive_jobs_lease        on hive.jobs (lease_expires_at) where state = 'LEASED';

-- Coherencia status ⇄ state sin recursión.
-- `state` manda; `status` es su proyección sobre el dominio real de Neon.
create or replace function hive.sync_job_status()
returns trigger language plpgsql set search_path = '' as $$
declare v_mapped text;
begin
  if tg_op = 'INSERT' then
    -- `status` es la interfaz de la herramienta real: si viene escrito, manda.
    -- (El default 'QUEUED' de `state` no debe tapar un status='RUNNING' explícito.)
    if new.status is not null then
      new.state := hive.state_from_job_status(new.status);
    elsif new.state is null then
      new.state := 'QUEUED';
    end if;
    if new.state in ('SUCCEEDED','FAILED','CANCELLED') and new.finished_at is null then
      new.finished_at := coalesce(new.finished_at, new.created_at, now());
    end if;
    if new.state = 'LEASED' and new.lease_expires_at is null then
      -- Un RUNNING escrito desde fuera recibe un lease: si el proceso muere, la
      -- recuperación puede reencolarlo en vez de dejarlo colgado para siempre.
      new.lease_expires_at := now() + make_interval(secs => hive.setting_int('lease_seconds', 120));
    end if;
    new.legacy_status := coalesce(new.legacy_status, new.status);
    new.status := hive.status_for_state(new.state);
    return new;
  end if;

  if new.state is distinct from old.state then
    if old.state in ('SUCCEEDED','FAILED','CANCELLED') and new.state = 'QUEUED' then
      raise exception 'TERMINAL_STATE_CANNOT_REQUEUE: la tarea % estaba en % y no vuelve a la cola', old.id, old.state;
    end if;
    new.legacy_status := coalesce(old.legacy_status, old.status);
    new.status := hive.status_for_state(new.state);
    if new.state in ('SUCCEEDED','FAILED','CANCELLED') and new.finished_at is null then
      new.finished_at := now();
    end if;
  elsif new.status is distinct from old.status then
    -- Escritura externa sobre `status`: se traduce a `state`, pero una tarea terminal
    -- NO se reactiva por un UPDATE directo (PENDING/RUNNING sobre algo ya cerrado).
    new.legacy_status := coalesce(old.legacy_status, old.status);
    v_mapped := hive.state_from_job_status(new.status);
    if old.state in ('SUCCEEDED','FAILED','CANCELLED')
       and v_mapped not in ('SUCCEEDED','FAILED','CANCELLED') then
      raise exception 'TERMINAL_STATE_CANNOT_REQUEUE: la tarea % está en % y un UPDATE de status a % no la revive',
        old.id, old.state, new.status;
    end if;
    if v_mapped = 'LEASED' and new.lease_expires_at is null then
      new.lease_expires_at := now() + make_interval(secs => hive.setting_int('lease_seconds', 120));
    end if;
    new.state := v_mapped;
    new.status := hive.status_for_state(new.state);
  end if;
  return new;
end $$;

drop trigger if exists hive_jobs_sync_status on hive.jobs;
create trigger hive_jobs_sync_status
  before insert or update on hive.jobs
  for each row execute function hive.sync_job_status();

create table if not exists hive.job_events (
  id         bigserial primary key,
  job_id     uuid not null references hive.jobs (id) on delete restrict,
  event      text not null,
  actor      text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists hive_job_events_job on hive.job_events (job_id, created_at);
