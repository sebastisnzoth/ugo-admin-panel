-- UGO Hive · rollback NO DESTRUCTIVO.
--
-- PROHIBIDO `drop schema hive cascade` y prohibido cualquier `drop table`: los registros
-- existentes se conservan. El rollback retira la *capacidad de operar* y deja los datos
-- intactos y legibles, para poder volver a aplicar el paquete sin pérdida.
--
-- Uso: psql "$HIVE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f hive/neon/rollback/rollback_non_destructive.sql

begin;

-- 1. Se cierra la puerta: ni ejecución ni lectura mientras dure el rollback.
revoke all on schema hive from hive_worker, hive_reader;
revoke all on all tables    in schema hive from hive_worker, hive_reader;
revoke all on all functions in schema hive from hive_worker, hive_reader;

-- 2. Se retiran sólo las funciones de operación (no contienen datos).
drop function if exists hive.complete_job(uuid, text, bigint, jsonb, text);
drop function if exists hive.complete_job(uuid, text, jsonb);
drop function if exists hive.fail_job(uuid, text, bigint, text, integer);
drop function if exists hive.fail_job(uuid, text, text, integer);
drop function if exists hive.heartbeat_job(uuid, text, bigint, integer);
drop function if exists hive.heartbeat_job(uuid, text, integer);
drop function if exists hive.recover_expired_leases(integer, integer);
drop function if exists hive.revoke_leases_all();
drop function if exists hive.reserve_job(text, integer, text);
drop function if exists hive.reserve_job(text, integer);
drop function if exists hive.lease_state(uuid, text, bigint);
drop function if exists hive.enqueue_job(text, integer, text, smallint, jsonb, timestamptz, integer, text);
drop function if exists hive.enqueue_job(text, integer, text, smallint, jsonb, timestamptz, integer);
drop function if exists hive.activate_agent(text, boolean);
drop function if exists hive.deactivate_agent(text);
drop function if exists hive.record_provider_call(text, integer, bigint);
drop function if exists hive.queue_metrics();
drop function if exists hive.agent_census();
drop function if exists hive.effect_already_applied(text);
drop function if exists hive.quota_state(text, date);
drop function if exists hive.setting_int(text, integer);

-- 3. Los leases abiertos quedan liberados para que ningún worker crea que sigue vivo.
--    Las tareas terminadas (SUCCEEDED/FAILED/CANCELLED) no se tocan jamás: el trigger
--    de 03 impide además devolverlas a la cola.
update hive.jobs
   set state = 'QUEUED', lease_owner = null, lease_expires_at = null, heartbeat_at = null,
       last_error = 'ROLLBACK_NON_DESTRUCTIVE', updated_at = now()
 where state = 'LEASED';

-- 4. Se deja constancia en meta y se conservan TODAS las tablas y filas.
update hive.meta set value = 'rolled-back-non-destructive', updated_at = now() where key = 'schema_state';
insert into hive.meta (key, value) values ('schema_state', 'rolled-back-non-destructive')
  on conflict (key) do update set value = excluded.value, updated_at = now();

commit;

-- Verificación de que no se borró nada (ejecutar después; compara con el preflight):
--   select 'agents' t, count(*) from hive.agents
--   union all select 'jobs', count(*) from hive.jobs
--   union all select 'provider_circuits', count(*) from hive.provider_circuits
--   union all select 'job_events', count(*) from hive.job_events;
