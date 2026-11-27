-- UGO Hive · 08 · Verificación posterior (sólo lectura de catálogo y conteos).
-- Falla con excepción si el resultado no es el esperado: una migración que "termina bien"
-- sin comprobar invariantes no acredita nada.

do $$
declare
  v_departments integer; v_agents integer; v_agents_expected integer;
  v_marker text; v_missing text;
begin
  select count(*) into v_departments from hive.departments;
  if v_departments <> 13 then
    raise exception 'VERIFY_FAILED: se esperaban 13 departamentos, hay %', v_departments;
  end if;

  select count(*) into v_agents from hive.agents;
  -- Los 118 del canon deben estar registrados al menos una vez; puede haber más si el
  -- operador ya tenía agentes propios. Nunca menos.
  if v_agents < 118 then
    raise exception 'VERIFY_FAILED: se esperaban al menos 118 agentes (canon), hay %', v_agents;
  end if;

  select value into v_marker from hive.meta where key = 'neon_project_id';
  if v_marker is distinct from 'dry-heart-24391962' then
    raise exception 'VERIFY_FAILED: marcador de proyecto ausente o distinto (%)', coalesce(v_marker, 'null');
  end if;

  -- Columnas críticas presentes (compatibilidad con tablas preexistentes).
  select string_agg(need.col, ', ') into v_missing
    from (values ('hive','jobs','lease_token'), ('hive','jobs','idempotency_key'),
                 ('hive','jobs','state'), ('hive','jobs','available_at'),
                 ('hive','agents','state'), ('hive','agents','department_id'),
                 ('hive','provider_circuits','blocked_until'),
                 ('hive','job_effects','effect_key')) as need(sch, tbl, col)
   where not exists (select 1 from information_schema.columns c
                      where c.table_schema = need.sch and c.table_name = need.tbl and c.column_name = need.col);
  if v_missing is not null then
    raise exception 'VERIFY_FAILED: faltan columnas críticas: %', v_missing;
  end if;

  -- Funciones operativas presentes.
  select string_agg(f.name, ', ') into v_missing
    from (values ('enqueue_job'), ('reserve_job'), ('heartbeat_job'), ('complete_job'),
                 ('fail_job'), ('recover_expired_leases'), ('queue_metrics'),
                 ('activate_agent')) as f(name)
   where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'hive' and p.proname = f.name);
  if v_missing is not null then
    raise exception 'VERIFY_FAILED: faltan funciones: %', v_missing;
  end if;

  -- Roles separados presentes.
  select string_agg(r.name, ', ') into v_missing
    from (values ('hive_migrator'), ('hive_worker'), ('hive_reader')) as r(name)
   where not exists (select 1 from pg_roles where rolname = r.name);
  if v_missing is not null then
    raise exception 'VERIFY_FAILED: faltan roles: %', v_missing;
  end if;

  -- Aislamiento: el esquema hive no debe contener tablas de Arena.
  select string_agg(t.table_name, ', ') into v_missing
    from information_schema.tables t
   where t.table_schema = 'hive'
     and t.table_name in ('usuarios', 'autonomous_jobs', 'autonomous_agents', 'servicos', 'solicitudes');
  if v_missing is not null then
    raise exception 'VERIFY_FAILED: el esquema hive contiene tablas de Arena: %', v_missing;
  end if;

  select count(*) into v_agents_expected from hive.agents where state = 'OPERATIVE';
  raise notice 'HIVE_VERIFY_OK departamentos=% agentes=% operativos=% version=%',
    v_departments, v_agents, v_agents_expected,
    (select value from hive.meta where key = 'schema_version');
end $$;
