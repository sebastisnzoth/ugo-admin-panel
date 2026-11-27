-- UGO Hive · 00 · Puerta de destino y metadatos.
--
-- Esta migración ABORTA si el destino no es exactamente la base autorizada de Hive
-- TEST. No se apoya en el nombre del host (frágil) sino en hechos verificables en SQL:
--   1) el proyecto declarado debe ser el autorizado (dry-heart-24391962);
--   2) la base declarada y la conectada deben llamarse `hive`;
--   3) la base NO debe parecer UGO Arena (presencia de tablas de Arena en `public`);
--   4) si la base ya está marcada con otro proyecto, se rechaza.
--
-- Parámetros (los inyecta apply.sh por PGOPTIONS, nunca en el repositorio):
--   hive.target_project   = dry-heart-24391962
--   hive.target_database  = hive
-- y sólo para motores embebidos de prueba:
--   hive.skip_database_name_check = 1   (queda auditado en hive.meta)

do $$
declare
  v_project  text := nullif(current_setting('hive.target_project', true), '');
  v_expected text := nullif(current_setting('hive.target_database', true), '');
  v_current  text := current_database();
  v_bypass   text := nullif(current_setting('hive.skip_database_name_check', true), '');
  v_marker   text;
  v_arena    integer;
begin
  if v_project is distinct from 'dry-heart-24391962' then
    raise exception 'DESTINATION_REJECTED: proyecto declarado %, autorizado dry-heart-24391962', coalesce(v_project, '(ninguno)');
  end if;
  if v_expected is distinct from 'hive' then
    raise exception 'DESTINATION_REJECTED: base declarada %, autorizada hive', coalesce(v_expected, '(ninguna)');
  end if;
  if coalesce(v_bypass, '') <> '1' and v_current <> v_expected then
    raise exception 'DESTINATION_REJECTED: conectado a %, esperado %', v_current, v_expected;
  end if;

  select count(*) into v_arena
    from information_schema.tables
   where table_schema = 'public'
     and table_name in ('usuarios', 'autonomous_jobs', 'autonomous_agents', 'servicos', 'solicitudes');
  if v_arena > 0 then
    raise exception 'DESTINATION_REJECTED: el destino contiene % tablas de UGO Arena; Hive no comparte base con Arena', v_arena;
  end if;

  create schema if not exists hive;
  create table if not exists hive.meta (
    key        text primary key,
    value      text not null,
    updated_at timestamptz not null default now()
  );

  select value into v_marker from hive.meta where key = 'neon_project_id';
  if v_marker is not null and v_marker <> v_project then
    raise exception 'DESTINATION_REJECTED: esta base pertenece al proyecto %, no a %', v_marker, v_project;
  end if;

  insert into hive.meta (key, value) values ('neon_project_id', v_project) on conflict (key) do nothing;
  insert into hive.meta (key, value) values ('schema_version', '2.0.0')
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into hive.meta (key, value) values ('destination_check', case when coalesce(v_bypass,'') = '1' then 'test-bypass' else 'full' end)
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into hive.meta (key, value) values ('applied_at', now()::text)
    on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;
