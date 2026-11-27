-- UGO Hive · 02 · Catálogo: 13 departamentos, agentes y censo de activación.
--
-- ESQUEMA REAL (verificado por ChatGPT en Neon `dry-heart-24391962`, base `hive`):
--   hive.agents(id uuid, name text UNIQUE, status text, last_heartbeat timestamptz)
--   con 9 filas ya existentes.
-- La primera versión asumía `agent_key` como clave y fallaba contra esa tabla.
--
-- Lo que hace esta migración, en orden y sin borrar nada:
--   1. conserva el `status` original en `legacy_status` (ningún dato se pierde);
--   2. rellena `agent_key` con un slug único de `name` (deduplicado por id);
--   3. sólo después crea el índice único de `agent_key`, y aborta si hubiera conflicto;
--   4. deriva `state` del `status` de forma conservadora: NUNCA promueve a OPERATIVE
--      por sí sola (9 agentes "active" no pueden saltarse max_operative_agents = 1);
--   5. siembra el canon con ON CONFLICT DO NOTHING (sin objetivo: tolera conflictos
--      tanto de `agent_key` como del UNIQUE de `name` ya existente);
--   6. instala un trigger que mantiene `status` y `state` coherentes en ambos sentidos.

create table if not exists hive.departments (
  id    integer primary key,
  key   text not null,
  name  text not null,
  focus text not null
);
alter table hive.departments add column if not exists key   text;
alter table hive.departments add column if not exists name  text;
alter table hive.departments add column if not exists focus text;

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

create table if not exists hive.settings (
  key   text primary key,
  value jsonb not null,
  note  text
);

-- Límites conservadores de arranque. `on conflict do nothing`: si el operador ya fijó
-- otro valor, se respeta.
insert into hive.settings (key, value, note) values
  ('max_concurrent_jobs',       '1'::jsonb,     'Un único trabajo simultáneo al arrancar.'),
  ('default_max_attempts',      '3'::jsonb,     'Sin reintentos infinitos.'),
  ('lease_seconds',             '120'::jsonb,   'Lease corto para recuperar rápido.'),
  ('max_operative_agents',      '1'::jsonb,     'Ningún despliegue masivo de los 118 agentes.'),
  ('daily_calls_per_provider',  '20'::jsonb,    'Límite conservador diario por proveedor.'),
  ('daily_tokens_per_provider', '20000'::jsonb, 'Límite conservador diario de tokens.')
on conflict (key) do nothing;

create or replace function hive.setting_int(p_key text, p_default integer)
returns integer language sql stable set search_path = '' as $$
  select coalesce((select (value #>> '{}')::integer from hive.settings where key = p_key), p_default);
$$;

-- Forma REAL de la tabla, tal como existe en Neon. En una base nueva se crea igual.
create table if not exists hive.agents (
  id             uuid primary key default gen_random_uuid(),
  name           text unique,
  status         text,
  last_heartbeat timestamptz
);
-- Columnas que el paquete necesita y que la tabla real no tiene. Sólo se añaden.
alter table hive.agents add column if not exists id              uuid default gen_random_uuid();
alter table hive.agents add column if not exists agent_key       text;
alter table hive.agents add column if not exists department_id   integer;
alter table hive.agents add column if not exists state           text;
alter table hive.agents add column if not exists legacy_status   text;
alter table hive.agents add column if not exists max_concurrency integer default 1;
alter table hive.agents add column if not exists source          text;
alter table hive.agents add column if not exists last_heartbeat timestamptz;
alter table hive.agents add column if not exists last_seen_at    timestamptz;
alter table hive.agents add column if not exists updated_at      timestamptz default now();

-- Slug estable y seguro para usar como clave.
-- Sin `unaccent` (no siempre está disponible): se pliegan los acentos latinos con
-- translate(), para que 'QA – Regressão' dé 'qa-regressao' y no 'qa-regress-o'.
create or replace function hive.slug(p_text text)
returns text language sql immutable set search_path = '' as $$
  -- translate() exige listas de igual longitud: 25 acentos → 25 letras base.
  select coalesce(nullif(trim(both '-' from regexp_replace(
           translate(lower(coalesce(p_text, '')),
             'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
             'aaaaaaeeeeiiiiooooouuuucnyy'),
           '[^a-z0-9]+', '-', 'g')), ''), '');
$$;

-- `id` es la clave real de la tabla; en una tabla de otro diseño puede faltar.
update hive.agents set id = gen_random_uuid() where id is null;
create unique index if not exists hive_agents_id_key on hive.agents (id);

-- 1 · Conservar el status original antes de tocar nada.
update hive.agents set legacy_status = status
 where legacy_status is null and status is not null;
update hive.agents set last_seen_at = coalesce(last_seen_at, last_heartbeat)
 where last_seen_at is null and last_heartbeat is not null;
update hive.agents set name = 'agente-' || left(id::text, 8)
 where name is null;

-- 2 · agent_key único derivado de `name`: duplicados resueltos por orden de `id`.
with base as (
  select id,
         coalesce(nullif(hive.slug(name), ''), 'agent') as slug,
         row_number() over (
           partition by coalesce(nullif(hive.slug(name), ''), 'agent')
           order by id
         ) as rn
    from hive.agents
   where agent_key is null
), candidate as (
  select id, case when rn = 1 then slug else slug || '-' || rn end as key from base
)
update hive.agents a set agent_key = c.key from candidate c where a.id = c.id;

-- 3 · Nunca se "resuelve" un conflicto borrando: se aborta y decide el operador.
do $$
declare v_dup text;
begin
  select string_agg(agent_key, ', ') into v_dup
    from (select agent_key from hive.agents where agent_key is not null
           group by agent_key having count(*) > 1) d;
  if v_dup is not null then
    raise exception 'AGENT_KEY_CONFLICT: claves duplicadas (%); resolver a mano, no se borra nada', v_dup;
  end if;
  if exists (select 1 from hive.agents where agent_key is null) then
    raise exception 'AGENT_KEY_UNRESOLVED: quedaron agentes sin agent_key';
  end if;
end $$;

alter table hive.agents alter column agent_key set not null;
create unique index if not exists hive_agents_agent_key_key on hive.agents (agent_key);

-- 4 · `state` se deriva del `status` real, de forma conservadora.
create or replace function hive.state_from_status(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case
    when lower(coalesce(p_status, '')) in ('disabled','inactive','paused','off','stopped','suspended') then 'DISABLED'
    when lower(coalesce(p_status, '')) in ('connected','online','ready','healthy')                    then 'CONNECTED'
    when lower(p_status) = 'operative'                                                               then 'OPERATIVE'
    else 'REGISTERED'
  end;
$$;
update hive.agents set state = hive.state_from_status(status) where state is null;

-- 5 · Canon: 118 agentes. `on conflict do nothing` sin objetivo tolera el UNIQUE(name)
--     de la tabla real además del UNIQUE(agent_key): ningún nombre existente se duplica.
insert into hive.agents (agent_key, department_id, name, state, source)
select v.agent_key, v.department_id, initcap(replace(v.agent_key, '-', ' ')), v.state,
       'docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md §5'
  from (values
  ('corporate-strategy', 1, 'REGISTERED'),
  ('exception-coordinator', 1, 'REGISTERED'),
  ('executive-intelligence', 1, 'REGISTERED'),
  ('executive-orchestrator', 1, 'REGISTERED'),
  ('outcome-learning', 1, 'REGISTERED'),
  ('priority-resource-orchestrator', 1, 'REGISTERED'),
  ('arrival-geofence-agent', 2, 'REGISTERED'),
  ('dispatch-agent', 2, 'REGISTERED'),
  ('gps-validation-agent', 2, 'REGISTERED'),
  ('incident-operations-agent', 2, 'REGISTERED'),
  ('matching-agent', 2, 'REGISTERED'),
  ('operational-recovery-agent', 2, 'REGISTERED'),
  ('operations-agent', 2, 'REGISTERED'),
  ('provider-radius-agent', 2, 'REGISTERED'),
  ('realtime-operations-agent', 2, 'REGISTERED'),
  ('service-lifecycle-agent', 2, 'REGISTERED'),
  ('travel-monitoring-agent', 2, 'REGISTERED'),
  ('billing-support-agent', 3, 'REGISTERED'),
  ('client-experience-agent', 3, 'REGISTERED'),
  ('client-feedback-agent', 3, 'REGISTERED'),
  ('client-journey-agent', 3, 'REGISTERED'),
  ('client-support-agent', 3, 'REGISTERED'),
  ('complaint-agent', 3, 'REGISTERED'),
  ('retention-agent', 3, 'REGISTERED'),
  ('voice-of-client-agent', 3, 'REGISTERED'),
  ('provider-activation-agent', 4, 'REGISTERED'),
  ('provider-agent', 4, 'REGISTERED'),
  ('provider-fairness-agent', 4, 'REGISTERED'),
  ('provider-onboarding-agent', 4, 'REGISTERED'),
  ('provider-quality-agent', 4, 'REGISTERED'),
  ('provider-recruitment-agent', 4, 'REGISTERED'),
  ('provider-retention-agent', 4, 'REGISTERED'),
  ('provider-supply-agent', 4, 'REGISTERED'),
  ('provider-support-agent', 4, 'REGISTERED'),
  ('voice-of-provider-agent', 4, 'REGISTERED'),
  ('acquisition-agent', 5, 'REGISTERED'),
  ('expansion-agent', 5, 'REGISTERED'),
  ('growth-expansion-agent', 5, 'REGISTERED'),
  ('growth-experiment-agent', 5, 'REGISTERED'),
  ('market-intelligence-agent', 5, 'REGISTERED'),
  ('revenue-growth-agent', 5, 'REGISTERED'),
  ('territory-intelligence-agent', 5, 'REGISTERED'),
  ('abuse-detection-agent', 6, 'REGISTERED'),
  ('appeals-agent', 6, 'REGISTERED'),
  ('case-manager', 6, 'REGISTERED'),
  ('critical-escalation-agent', 6, 'REGISTERED'),
  ('dispute-resolution-agent', 6, 'REGISTERED'),
  ('evidence-analysis-agent', 6, 'REGISTERED'),
  ('fraud-detection-agent', 6, 'REGISTERED'),
  ('trust-resolution-agent', 6, 'REGISTERED'),
  ('cash-payment-agent', 7, 'REGISTERED'),
  ('finance-agent', 7, 'REGISTERED'),
  ('financial-controller', 7, 'REGISTERED'),
  ('financial-risk-agent', 7, 'REGISTERED'),
  ('payment-agent', 7, 'REGISTERED'),
  ('provider-balance-agent', 7, 'REGISTERED'),
  ('reconciliation-agent', 7, 'REGISTERED'),
  ('refund-agent', 7, 'REGISTERED'),
  ('treasury-control-agent', 7, 'REGISTERED'),
  ('code-review-agent', 8, 'REGISTERED'),
  ('database-reliability-agent', 8, 'REGISTERED'),
  ('debugging-agent', 8, 'REGISTERED'),
  ('devops-agent', 8, 'REGISTERED'),
  ('model-router-agent', 8, 'REGISTERED'),
  ('observability-agent', 8, 'REGISTERED'),
  ('r-d-agent', 8, 'REGISTERED'),
  ('realtime-reliability-agent', 8, 'REGISTERED'),
  ('security-agent', 8, 'REGISTERED'),
  ('software-engineering-agent', 8, 'REGISTERED'),
  ('technology-radar-agent', 8, 'REGISTERED'),
  ('technology-security-agent', 8, 'REGISTERED'),
  ('admin-system-simulator', 9, 'REGISTERED'),
  ('chaos-agent', 9, 'REGISTERED'),
  ('client-simulator', 9, 'REGISTERED'),
  ('deterministic-judge', 9, 'REGISTERED'),
  ('meta-qa-agent', 9, 'REGISTERED'),
  ('p0-journey-tester', 9, 'REGISTERED'),
  ('provider-simulator', 9, 'REGISTERED'),
  ('qa-director', 9, 'REGISTERED'),
  ('qa-excellence-agent', 9, 'REGISTERED'),
  ('quality-coverage-agent', 9, 'REGISTERED'),
  ('regression-agent', 9, 'REGISTERED'),
  ('release-gate-agent', 9, 'REGISTERED'),
  ('compliance-agent', 10, 'REGISTERED'),
  ('consumer-protection-agent', 10, 'REGISTERED'),
  ('contract-agent', 10, 'REGISTERED'),
  ('corporate-protection-agent', 10, 'REGISTERED'),
  ('ip-gate-agent', 10, 'REGISTERED'),
  ('ip-protection-agent', 10, 'REGISTERED'),
  ('labor-risk-agent', 10, 'REGISTERED'),
  ('legal-intelligence-agent', 10, 'REGISTERED'),
  ('legal-policy-agent', 10, 'REGISTERED'),
  ('policy-agent', 10, 'REGISTERED'),
  ('privacy-agent', 10, 'REGISTERED'),
  ('brand-agent', 11, 'REGISTERED'),
  ('community-agent', 11, 'REGISTERED'),
  ('creative-agent', 11, 'REGISTERED'),
  ('localization-agent', 11, 'REGISTERED'),
  ('marketing-brand-agent', 11, 'REGISTERED'),
  ('marketing-campaign-agent', 11, 'REGISTERED'),
  ('marketing-experiment-agent', 11, 'REGISTERED'),
  ('pr-reputation-agent', 11, 'REGISTERED'),
  ('accessibility-agent', 12, 'REGISTERED'),
  ('design-system-agent', 12, 'REGISTERED'),
  ('product-analytics-agent', 12, 'REGISTERED'),
  ('product-design-agent', 12, 'REGISTERED'),
  ('product-experiment-agent', 12, 'REGISTERED'),
  ('product-manager-agent', 12, 'REGISTERED'),
  ('product-strategy-agent', 12, 'REGISTERED'),
  ('ui-ux-agent', 12, 'REGISTERED'),
  ('ux-research-agent', 12, 'REGISTERED'),
  ('ai-governance-auditor', 14, 'REGISTERED'),
  ('corporate-audit-agent', 14, 'DISABLED'),
  ('cross-department-auditor', 14, 'REGISTERED'),
  ('enterprise-risk-officer', 14, 'REGISTERED'),
  ('executive-assurance-challenge', 14, 'REGISTERED'),
  ('internal-auditor', 14, 'REGISTERED'),
  ('internal-control-inspector', 14, 'REGISTERED')
       ) as v(agent_key, department_id, state)
on conflict do nothing;

create index if not exists hive_agents_department on hive.agents (department_id);
create index if not exists hive_agents_state      on hive.agents (state);

-- Los agentes del canon entran como REGISTERED. `status` se mantiene coherente con
-- `state` para que cualquier lector de la tabla real siga viendo algo consistente.
update hive.agents set status = lower(state)
 where agent_key is not null and (status is null or status is distinct from lower(state));

-- 6 · Sincronización bidireccional status ⇄ state, sin recursión (trigger BEFORE).
create or replace function hive.sync_agent_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.agent_key := coalesce(new.agent_key, nullif(hive.slug(new.name), ''));
    new.legacy_status := coalesce(new.legacy_status, new.status);
    if new.state is null then new.state := hive.state_from_status(new.status); end if;
    new.status := lower(new.state);
    new.updated_at := coalesce(new.updated_at, now());
    return new;
  end if;

  if new.state is distinct from old.state then
    -- La fuente es `state`: se refleja en `status` y se conserva el valor previo.
    new.legacy_status := coalesce(old.legacy_status, old.status);
    new.status := lower(new.state);
  elsif new.status is distinct from old.status then
    -- Escritura externa sobre `status`: se traduce a `state` sin promover a OPERATIVE.
    new.legacy_status := coalesce(old.legacy_status, old.status);
    new.state := hive.state_from_status(new.status);
  end if;
  if new.agent_key is null then new.agent_key := nullif(hive.slug(new.name), ''); end if;
  return new;
end $$;

drop trigger if exists hive_agents_sync_status on hive.agents;
create trigger hive_agents_sync_status
  before insert or update on hive.agents
  for each row execute function hive.sync_agent_status();

-- Censo y activación controlada. Impide encender los 118 agentes a la vez.
create or replace function hive.agent_census()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'registered', (select count(*) from hive.agents where state = 'REGISTERED'),
    'connected',  (select count(*) from hive.agents where state = 'CONNECTED'),
    'operative',  (select count(*) from hive.agents where state = 'OPERATIVE'),
    'disabled',   (select count(*) from hive.agents where state = 'DISABLED'),
    'total',      (select count(*) from hive.agents),
    'legacy_status_preserved', (select count(*) from hive.agents where legacy_status is not null),
    'max_operative_agents', hive.setting_int('max_operative_agents', 1));
$$;

-- Activación controlada y SEGURA EN CONCURENCIA.
-- La versión anterior contaba los operativos y luego actualizaba: dos sesiones
-- simultáneas podían leer "0 operativos" y activar dos. Ahora el recuento y el UPDATE
-- van bajo un candado de transacción no bloqueante: la segunda sesión recibe
-- ACTIVATE_BUSY en lugar de superar el límite.
create or replace function hive.activate_agent(p_agent text, p_operative boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_lock constant bigint := hashtext('ugo_hive_activate_agent');
  v_id uuid; v_key text; v_state text;
  v_limit integer := hive.setting_int('max_operative_agents', 1);
  v_operative integer;
  v_target text := case when p_operative then 'OPERATIVE' else 'CONNECTED' end;
begin
  if p_agent is null or length(trim(p_agent)) = 0 then
    raise exception 'AGENT_NOT_REGISTERED: clave vacía';
  end if;
  if not pg_try_advisory_xact_lock(v_lock) then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATE_BUSY',
                              'detail', 'otra activación en curso; reintentar con backoff acotado');
  end if;

  select id, agent_key, state into v_id, v_key, v_state
    from hive.agents where agent_key = p_agent or name = p_agent;
  if v_id is null then raise exception 'AGENT_NOT_REGISTERED: %', p_agent; end if;
  if v_state = 'DISABLED' then raise exception 'AGENT_DISABLED: %', v_key; end if;

  if p_operative then
    select count(*) into v_operative from hive.agents
     where state = 'OPERATIVE' and id <> v_id;
    if v_operative >= v_limit then
      raise exception 'OPERATIVE_LIMIT_REACHED: % de % agentes operativos; subir max_operative_agents sólo tras medir consumo', v_operative, v_limit;
    end if;
  end if;

  update hive.agents set state = v_target, last_seen_at = now(), updated_at = now()
   where id = v_id;
  return jsonb_build_object('ok', true, 'agent_key', v_key, 'state', v_target,
                            'max_operative_agents', v_limit,
                            'legacy_status_kept', (select legacy_status from hive.agents where id = v_id));
end $$;

create or replace function hive.deactivate_agent(p_agent_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update hive.agents set state = 'REGISTERED', updated_at = now() where agent_key = p_agent_key;
  if not found then raise exception 'AGENT_NOT_REGISTERED: %', p_agent_key; end if;
  return jsonb_build_object('ok', true, 'agent_key', p_agent_key, 'state', 'REGISTERED');
end $$;
