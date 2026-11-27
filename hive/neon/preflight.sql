-- UGO Hive · preflight · SOLO LECTURA.
--
-- Antes de migrar, el operador obtiene el estado real del destino: qué existe ya, con
-- qué columnas y cuántas filas. Prohibido asumir una base vacía: las tablas
-- `hive.agents`, `hive.jobs` y `hive.provider_circuits` pueden existir con otro diseño.
--
-- Uso:  psql "$HIVE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f hive/neon/preflight.sql
-- No modifica nada: sólo SELECT sobre catálogos del sistema.

\echo '== destino =='
select current_database() as database, current_user as role,
       (select value from hive.meta where key = 'neon_project_id') as marcador_proyecto
  from (select 1) x
 where to_regclass('hive.meta') is not null
union all
select current_database(), current_user, '(hive.meta no existe todavía)'
 where to_regclass('hive.meta') is null;

\echo '== esquemas presentes =='
select nspname as esquema from pg_namespace
 where nspname not like 'pg\_%' and nspname not in ('information_schema')
 order by 1;

\echo '== tablas del esquema hive (si existe) =='
select c.relname as tabla, c.reltuples::bigint as filas_estimadas
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'hive' and c.relkind = 'r'
 order by 1;

\echo '== columnas de las tablas que el paquete necesita =='
select table_name, column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'hive'
   and table_name in ('agents', 'jobs', 'provider_circuits', 'departments', 'settings',
                      'job_events', 'job_effects', 'provider_daily_usage')
 order by table_name, ordinal_position;

\echo '== conteos reales (nunca estimaciones) =='
do $$
declare t text; n bigint;
begin
  foreach t in array array['agents', 'jobs', 'provider_circuits', 'job_events', 'job_effects']
  loop
    if to_regclass('hive.' || t) is not null then
      execute format('select count(*) from hive.%I', t) into n;
      raise notice 'fila % = %', t, n;
    else
      raise notice 'tabla % no existe todavía', t;
    end if;
  end loop;
end $$;

\echo '== índices existentes en hive =='
select tablename, indexname, indexdef from pg_indexes where schemaname = 'hive' order by 1, 2;

\echo '== roles de Hive presentes =='
select rolname, rolcanlogin from pg_roles where rolname like 'hive\_%' order by 1;

\echo '== huella de Arena en public (debe estar vacía) =='
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('usuarios', 'autonomous_jobs', 'autonomous_agents', 'servicos', 'solicitudes');
