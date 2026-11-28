-- UGO Hive · login de LECTURA para el endpoint de la consola Super Admin.
--
-- Separado del worker a propósito: la consola no ejecuta la cola, sólo la observa. Este
-- script NO forma parte del paquete de migraciones (00..08 ya aplicado como 2.2.0): es un
-- script de operador, idempotente y con guardas. No crea objetos ni toca datos.
--
--   psql "$HIVE_MIGRATOR_DATABASE_URL" \
--        -v hive_confirm=APLICAR \
--        -v hive_password="$(openssl rand -base64 32)" \
--        -v hive_login=hive_console_ro \
--        -f hive/reader/sql/reader_login.sql
--
-- La contraseña entra por variable; nunca se escribe en el repositorio ni en logs.

\set ON_ERROR_STOP on
\if :{?hive_confirm}
\else
  \set hive_confirm REFUSED
\endif
\if :{?hive_password}
\else
  \set hive_password ''
\endif
\if :{?hive_login}
\else
  \set hive_login hive_console_ro
\endif

create or replace function pg_temp.hive_require(p_ok boolean, p_message text) returns void
language plpgsql as $fn$
begin
  if not p_ok then raise exception 'REFUSED: %', p_message; end if;
end $fn$;

select pg_temp.hive_require(:'hive_confirm' = 'APLICAR', 'falta -v hive_confirm=APLICAR');
select pg_temp.hive_require(length(:'hive_password') >= 24, 'la contraseña debe tener al menos 24 caracteres');
select pg_temp.hive_require(:'hive_login' ~ '^[a-z][a-z0-9_]{2,30}$', 'nombre de login inválido');
select pg_temp.hive_require(exists (select 1 from pg_roles where rolname = 'hive_reader'),
  'el rol de grupo hive_reader no existe: aplica antes la migración 01_roles');

select (count(*) = 0) as hive_login_missing from pg_roles where rolname = :'hive_login' \gset

\if :hive_login_missing
  create role :"hive_login" login;
\endif

alter role :"hive_login" login password :'hive_password' connection limit 3;
alter role :"hive_login" set statement_timeout = '10s';
alter role :"hive_login" set idle_in_transaction_session_timeout = '10s';
alter role :"hive_login" set lock_timeout = '3s';
alter role :"hive_login" set default_transaction_read_only = on;
alter role :"hive_login" set application_name = 'ugo-hive-console-ro';

grant hive_reader to :"hive_login";

-- ── Verificación (todo debe imprimir `t`) ───────────────────────────────────────
select 'reader_member' as check, pg_has_role(:'hive_login', 'hive_reader', 'member') as ok
union all select 'not_superuser', not (select rolsuper from pg_roles where rolname = :'hive_login')
union all select 'read_only_transactions', (select rolconfig::text like '%default_transaction_read_only=on%' from pg_roles where rolname = :'hive_login')
union all select 'no_insert_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'INSERT')
union all select 'no_update_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'UPDATE')
union all select 'no_delete_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'DELETE')
union all select 'can_select_jobs', has_table_privilege(:'hive_login', 'hive.jobs', 'SELECT')
union all select 'cannot_reserve', not has_function_privilege(:'hive_login', 'hive.reserve_job(text,integer,text)', 'EXECUTE')
union all select 'cannot_complete', not has_function_privilege(:'hive_login', 'hive.complete_job(uuid,text,bigint,jsonb,text)', 'EXECUTE')
union all select 'can_read_metrics', has_function_privilege(:'hive_login', 'hive.queue_metrics()', 'EXECUTE')
union all select 'can_read_census', has_function_privilege(:'hive_login', 'hive.agent_census()', 'EXECUTE');

select format('postgresql://%s@<host>/hive?sslmode=require', :'hive_login') as reader_url_shape;
