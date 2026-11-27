-- UGO Hive · 07 · Privilegios mínimos y separación de roles.
--
--   hive_migrator → DDL y propiedad de objetos (aplicar migraciones, nada de negocio)
--   hive_worker   → EXECUTE sobre las operaciones de cola; sin escritura directa ni DDL
--   hive_reader   → SELECT y métricas; sin escritura, sin DDL, sin operaciones de cola
--
-- Postgres concede EXECUTE a PUBLIC por defecto en cada función: se retira siempre.

revoke all on schema hive from public;
revoke all on all tables    in schema hive from public;
revoke all on all functions in schema hive from public;

grant usage  on schema hive to hive_migrator, hive_worker, hive_reader;
grant create on schema hive to hive_migrator;

grant all privileges on all tables in schema hive to hive_migrator;
grant all privileges on all functions in schema hive to hive_migrator;
grant all privileges on all sequences in schema hive to hive_migrator;
alter default privileges in schema hive grant all on tables to hive_migrator;
alter default privileges in schema hive grant all on functions to hive_migrator;
alter default privileges in schema hive grant all on sequences to hive_migrator;

-- Ejecución: lee catálogo y estado, ejecuta funciones. No escribe tablas ni hace DDL.
grant select on hive.departments, hive.agents, hive.settings, hive.meta,
                hive.jobs, hive.job_events, hive.job_effects,
                hive.provider_daily_usage, hive.provider_circuits
  to hive_worker;
grant execute on function hive.enqueue_job(text, integer, text, smallint, jsonb, timestamptz, integer) to hive_worker;
grant execute on function hive.reserve_job(text, integer)                to hive_worker;
grant execute on function hive.heartbeat_job(uuid, text, bigint, integer) to hive_worker;
grant execute on function hive.complete_job(uuid, text, bigint, jsonb, text) to hive_worker;
grant execute on function hive.fail_job(uuid, text, bigint, text, integer)   to hive_worker;
grant execute on function hive.recover_expired_leases(integer, integer)  to hive_worker;
grant execute on function hive.record_provider_call(text, integer, bigint) to hive_worker;
grant execute on function hive.quota_state(text, date)                   to hive_worker;
grant execute on function hive.setting_int(text, integer)                to hive_worker;
grant execute on function hive.agent_census()                            to hive_worker;
grant execute on function hive.queue_metrics()                           to hive_worker;
grant execute on function hive.effect_already_applied(text)              to hive_worker;
grant execute on function hive.activate_agent(text, boolean)             to hive_worker;
grant execute on function hive.deactivate_agent(text)                    to hive_worker;

-- Lectura: consola Super Admin, Sentinel y Judge. Sin mutaciones.
grant select on hive.departments, hive.agents, hive.settings, hive.meta,
                hive.jobs, hive.job_events, hive.job_effects,
                hive.provider_daily_usage, hive.provider_circuits
  to hive_reader;
grant execute on function hive.quota_state(text, date)   to hive_reader;
grant execute on function hive.agent_census()            to hive_reader;
grant execute on function hive.queue_metrics()           to hive_reader;
grant execute on function hive.effect_already_applied(text) to hive_reader;
grant execute on function hive.setting_int(text, integer)   to hive_reader;

-- Cualquier escritura, DDL o secuencia queda fuera del alcance del worker y del reader.
revoke create on schema hive from hive_worker, hive_reader;
revoke insert, update, delete, truncate, references, trigger on all tables in schema hive
  from hive_worker, hive_reader;
