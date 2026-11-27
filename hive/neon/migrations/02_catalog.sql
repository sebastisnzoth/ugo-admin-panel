-- UGO Hive · 02 · Catálogo canónico: 13 departamentos, 118 agentes y censo de activación.
--
-- Los 118 agent_key se generan desde el inventario documentado
-- (docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md §5) y se insertan como REGISTERED:
-- estar registrado NO significa conectado ni operativo. Sólo `corporate-audit-agent`
-- entra como DISABLED porque así consta en el canon (§4: 117 IDLE + 1 DISABLED).
--
-- NO DESTRUCTIVO: el seed usa ON CONFLICT DO NOTHING sobre `agent_key`, de modo que
-- ningún estado, contador ni dato previo del operador se sobrescribe al reaplicar.

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

create table if not exists hive.agents (
  agent_key       text primary key,
  department_id   integer not null,
  name            text not null,
  state           text not null default 'REGISTERED',
  max_concurrency integer not null default 1,
  source          text,
  last_seen_at    timestamptz,
  updated_at      timestamptz not null default now()
);
-- Compatibilidad con una tabla preexistente: se añade lo que falte, nunca se borra nada.
alter table hive.agents add column if not exists department_id   integer;
alter table hive.agents add column if not exists name            text;
alter table hive.agents add column if not exists state           text default 'REGISTERED';
alter table hive.agents add column if not exists max_concurrency integer default 1;
alter table hive.agents add column if not exists source          text;
alter table hive.agents add column if not exists last_seen_at    timestamptz;
alter table hive.agents add column if not exists updated_at      timestamptz default now();

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
on conflict (agent_key) do nothing;

create index if not exists hive_agents_department on hive.agents (department_id);
create index if not exists hive_agents_state      on hive.agents (state);

-- Censo y activación controlada. Impide encender los 118 agentes a la vez.
create or replace function hive.agent_census()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'registered', (select count(*) from hive.agents where state = 'REGISTERED'),
    'connected',  (select count(*) from hive.agents where state = 'CONNECTED'),
    'operative',  (select count(*) from hive.agents where state = 'OPERATIVE'),
    'disabled',   (select count(*) from hive.agents where state = 'DISABLED'),
    'total',      (select count(*) from hive.agents),
    'max_operative_agents', hive.setting_int('max_operative_agents', 1));
$$;

create or replace function hive.activate_agent(p_agent_key text, p_operative boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_state text;
  v_limit integer := hive.setting_int('max_operative_agents', 1);
  v_operative integer;
  v_target text := case when p_operative then 'OPERATIVE' else 'CONNECTED' end;
begin
  select state into v_state from hive.agents where agent_key = p_agent_key;
  if v_state is null then raise exception 'AGENT_NOT_REGISTERED: %', p_agent_key; end if;
  if v_state = 'DISABLED' then raise exception 'AGENT_DISABLED: %', p_agent_key; end if;
  if p_operative then
    select count(*) into v_operative from hive.agents where state = 'OPERATIVE' and agent_key <> p_agent_key;
    if v_operative >= v_limit then
      raise exception 'OPERATIVE_LIMIT_REACHED: % de % agentes operativos; subir max_operative_agents sólo tras medir consumo', v_operative, v_limit;
    end if;
  end if;
  update hive.agents set state = v_target, last_seen_at = now(), updated_at = now()
   where agent_key = p_agent_key;
  return jsonb_build_object('ok', true, 'agent_key', p_agent_key, 'state', v_target,
                            'max_operative_agents', v_limit);
end $$;

create or replace function hive.deactivate_agent(p_agent_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update hive.agents set state = 'REGISTERED', updated_at = now() where agent_key = p_agent_key;
  if not found then raise exception 'AGENT_NOT_REGISTERED: %', p_agent_key; end if;
  return jsonb_build_object('ok', true, 'agent_key', p_agent_key, 'state', 'REGISTERED');
end $$;
