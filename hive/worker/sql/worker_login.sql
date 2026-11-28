-- UGO Hive · aprovisionamiento del LOGIN del worker.
--
-- NO forma parte del paquete de migraciones versionado (00..08 ya aplicado como 2.2.0):
-- es un script de operador, idempotente y con guardas, que sólo crea el login y comprueba
-- privilegios. No crea objetos, no borra nada, no toca datos.
--
-- Se ejecuta con el rol de migraciones (en Neon, desde la consola o con un login miembro de
-- hive_migrator). La contraseña NUNCA va en el repositorio: entra por variable de psql.
--
--   psql "$HIVE_MIGRATOR_DATABASE_URL" \
--        -v hive_confirm=APLICAR \
--        -v hive_password="$(openssl rand -base64 32)" \
--        -v hive_login=hive_app \
--        -f hive/worker/sql/worker_login.sql
--
-- Ajustes deliberados: sin CREATEDB/CREATEROLE, límite de conexiones, timeouts de sesión y
-- comprobación explícita de que NO puede escribir tablas.

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
  \set hive_login hive_app
\endif

create or replace function pg_temp.hive_require(p_ok boolean, p_message text) returns void
language plpgsql as $fn$
begin
  if not p_ok then raise exception 'REFUSED: %', p_message; end if;
end $fn$;

select pg_temp.hive_require(:'hive_confirm' = 'APLICAR', 'falta -v hive_confirm=APLICAR');
select pg_temp.hive_require(length(:'hive_password') >= 24, 'la contraseña debe tener al menos 24 caracteres');
select pg_temp.hive_require(:'hive_login' ~ '^[a-z][a-z0-9_]{2,30}$', 'nombre de login inválido');
select pg_temp.hive_require(exists (select 1 from pg_roles where rolname = 'hive_worker'),
  'el rol de grupo hive_worker no existe: aplica antes la migración 01_roles');

select (count(*) = 0) as hive_login_missing from pg_roles where rolname = :'hive_login' \gset

\if :hive_login_missing
  create role :"hive_login" login;
\endif

alter role :"hive_login" login password :'hive_password' connection limit 5;
alter role :"hive_login" set statement_timeout = '30s';
alter role :"hive_login" set idle_in_transaction_session_timeout = '30s';
alter role :"hive_login" set lock_timeout = '5s';
alter role :"hive_login" set application_name = 'ugo-hive-worker';

grant hive_worker to :"hive_login";

-- ── Verificación de privilegios mínimos (debe imprimir todo en `t`) ──────────────
select 'worker_member' as check, pg_has_role(:'hive_login', 'hive_worker', 'member') as ok
union all select 'not_superuser', not (select rolsuper from pg_roles where rolname = :'hive_login')
union all select 'cannot_create_db', not (select rolcreatedb from pg_roles where rolname = :'hive_login')
union all select 'cannot_create_role', not (select rolcreaterole from pg_roles where rolname = :'hive_login')
union all select 'no_insert_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'INSERT')
union all select 'no_update_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'UPDATE')
union all select 'no_delete_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'DELETE')
union all select 'no_truncate_jobs', not has_table_privilege(:'hive_login', 'hive.jobs', 'TRUNCATE')
union all select 'can_select_jobs', has_table_privilege(:'hive_login', 'hive.jobs', 'SELECT')
union all select 'can_reserve', has_function_privilege(:'hive_login', 'hive.reserve_job(text,integer,text)', 'EXECUTE')
union all select 'can_complete', has_function_privilege(:'hive_login', 'hive.complete_job(uuid,text,bigint,jsonb,text)', 'EXECUTE')
union all select 'can_record_budget', has_function_privilege(:'hive_login', 'hive.record_provider_call(text,integer,bigint)', 'EXECUTE');

-- Pista de conexión (sin contraseña): el worker sólo necesita esta URL.
select format('postgresql://%s@<host>/hive?sslmode=require', :'hive_login') as worker_url_shape;
