-- UGO Hive · 04 · Idempotencia de efectos externos.
--
-- Una cola con leases garantiza *al menos una* ejecución, no exactamente una: un worker
-- puede morir después de producir el efecto y antes de confirmar. Por eso el efecto
-- externo (enviar un correo, abrir un PR, registrar un cobro) se identifica con una
-- `effect_key` determinista y se registra aquí con clave primaria.
--
-- Contrato real, sin promesas de más:
--   · la reserva puede repetirse  → ejecución at-least-once
--   · el efecto se aplica una sola vez si el consumidor usa `effect_key` como clave
--   · `hive.complete_job` informa `effect_applied` (true la primera vez, false en repetición)
--
-- La prueba de exactitud sólo puede venir del consumidor del efecto (bóveda de pagos,
-- API de correo, GitHub). Este esquema no la certifica por sí solo.

create table if not exists hive.job_effects (
  effect_key text primary key,
  job_id     uuid not null,
  applied_at timestamptz not null default now(),
  detail     jsonb not null default '{}'::jsonb
);
create index if not exists hive_job_effects_job on hive.job_effects (job_id);

create or replace function hive.effect_already_applied(p_effect_key text)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from hive.job_effects where effect_key = p_effect_key);
$$;
