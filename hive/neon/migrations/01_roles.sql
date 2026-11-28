-- UGO Hive · 01 · Roles separados: migración, ejecución y lectura.
--
-- Tres roles de grupo (NOLOGIN). Los logins concretos se crean en la consola de Neon y
-- se les concede pertenencia; ninguna contraseña vive en el repositorio.
--   hive_migrator → DDL y propiedad lógica del esquema (sólo migraciones)
--   hive_worker   → ejecuta la cola a través de funciones, sin escribir tablas
--   hive_reader   → sólo lectura y métricas (consola, Sentinel, Judge)

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hive_migrator') then
    create role hive_migrator nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'hive_worker') then
    create role hive_worker nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'hive_reader') then
    create role hive_reader nologin;
  end if;
end $$;

comment on role hive_migrator is 'UGO Hive: aplica migraciones. No ejecuta tareas de negocio.';
comment on role hive_worker   is 'UGO Hive: ejecuta la cola vía funciones. Sin escritura directa de tablas.';
comment on role hive_reader   is 'UGO Hive: lectura y métricas. Sin DDL ni escritura.';

-- Por defecto ningún rol puede crear objetos en el esquema salvo el migrador.
revoke all on schema hive from public;
grant usage on schema hive to hive_migrator, hive_worker, hive_reader;
grant create on schema hive to hive_migrator;
