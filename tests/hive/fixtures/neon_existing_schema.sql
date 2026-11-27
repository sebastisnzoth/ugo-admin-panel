-- Réplica EXACTA del esquema informado por ChatGPT en Neon `dry-heart-24391962`, base `hive`
-- (verificación directa del 2026-11-27): 9 agentes, 1 tarea finalizada, 0 pendientes.
--
-- Se usa para probar la migración contra lo que hay, no contra lo que se supone.
-- Cualquier diferencia con la realidad invalida la prueba: por eso el DDL es literal.

create schema hive;

create table hive.agents (
  id             uuid primary key default gen_random_uuid(),
  name           text unique,
  status         text,
  last_heartbeat timestamptz
);

create table hive.jobs (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key text,
  agent_name      text,
  prompt          text not null,
  status          text,
  created_at      timestamptz default now()
);

insert into hive.agents (name, status, last_heartbeat) values
  ('Hugo Orchestrator',        'active',    now() - interval '2 hours'),
  ('Agente de Precios',        'active',    now() - interval '5 hours'),
  ('QA – Regressão',           'idle',      now() - interval '1 day'),
  ('Suporte ao Cliente',       'idle',      now() - interval '3 days'),
  ('Provider Ops',             'active',    now() - interval '30 minutes'),
  ('Finance Recon',            'paused',    null),
  ('Legal Review',             'active',    now() - interval '8 hours'),
  ('Growth Experiments',       'disabled',  null),
  ('Sentinel Watcher',         'active',    now() - interval '10 minutes');

-- Una única tarea, ya terminada. Nunca debe volver a la cola.
insert into hive.jobs (idempotency_key, agent_name, prompt, status, created_at) values
  ('legacy-task-0001', 'Hugo Orchestrator', 'Verificar saúde do sistema', 'DONE', now() - interval '1 day');
