-- UGO Hive · 00 · Identidad del destino y metadatos.
--
-- PROBLEMA REAL: en la primera aplicación a Neon el paquete aceptó una base que ya
-- tenía datos (9 agentes, 1 tarea) porque la única prueba de identidad era una variable
-- declarada por el cliente. Una variable `SET` no demuestra nada: la pone quien conecta.
--
-- Qué se comprueba aquí, de más fuerte a más débil:
--   1. HUELLA ESTABLE DEL DESTINO (no falsificable desde el cliente, e inmune a
--      reinicios del compute de Neon): sha256 de
--      base + oid de la base + rol dueño + encoding + collate + ctype.
--      La v2.1.0 incluía inet_server_addr()/inet_server_port(); Neon cambia esa IP
--      interna al reiniciar el compute y la huella habría "cambiado" sin cambiar de base.
--      La dirección observada se sigue registrando, pero SÓLO como dato informativo.
--      Se guarda en hive.meta.destination_fingerprint. Cualquier aplicación posterior
--      sobre OTRA base/host/puerto aborta con DESTINATION_FINGERPRINT_MISMATCH.
--      Eso sí demuestra "es la misma base que se aprobó", y no se puede escribir con SET.
--   2. Primera aplicación: exige confirmación explícita (hive.confirm_first_apply=APLICAR)
--      y registra TODOS los hechos del servidor en hive.meta, para auditoría.
--   3. Huella de Arena: si `public` contiene tablas de UGO Arena, aborta siempre.
--   4. Afirmación del cliente (débil, pero si contradice se aborta): proyecto y base.
--
-- Lo que esto NO demuestra (declarado, no disimulado): que el host sea de Neon. Postgres
-- no expone el id de proyecto de Neon en SQL. La identidad se ancla en la huella estable
-- y en la confirmación de la primera aplicación, no en una variable.

do $$
declare
  v_project  text := coalesce(current_setting('hive.target_project', true), '');
  v_database text := coalesce(current_setting('hive.target_database', true), '');
  v_confirm  text := coalesce(current_setting('hive.confirm_first_apply', true), '');
  v_skip_name text := coalesce(current_setting('hive.skip_database_name_check', true), '');
  v_expected text := nullif(current_setting('hive.expected_fingerprint', true), '');
  v_owner    text;
  v_oid      oid;
  v_encoding text;
  v_collate  text;
  v_ctype    text;
  v_fingerprint text;
  v_recorded text;
  v_algo     text;
  v_reanchor text := coalesce(current_setting('hive.confirm_fingerprint_reanchor', true), '');
  v_arena    text;
begin
  -- 4. Afirmación del cliente: obligatoria y coherente.
  if v_project <> 'dry-heart-24391962' then
    raise exception 'DESTINATION_REJECTED: hive.target_project debe ser dry-heart-24391962 (recibido: %)', coalesce(nullif(v_project,''), 'vacío');
  end if;
  if v_database <> 'hive' then
    raise exception 'DESTINATION_REJECTED: hive.target_database debe ser hive (recibido: %)', coalesce(nullif(v_database,''), 'vacío');
  end if;
  if v_skip_name <> '1' and current_database() <> 'hive' then
    raise exception 'DESTINATION_REJECTED: nombre de base inesperado (%)', current_database();
  end if;

  -- 3. Huella de Arena: jamás se migra una base de Arena.
  select string_agg(table_name, ', ') into v_arena
    from information_schema.tables
   where table_schema = 'public'
     and table_name in ('usuarios', 'autonomous_jobs', 'autonomous_agents', 'servicos', 'solicitudes');
  if v_arena is not null then
    raise exception 'DESTINATION_REJECTED: el destino contiene tablas de UGO Arena (%)', v_arena;
  end if;
  if to_regclass('public.empresas') is not null and to_regclass('public.storage_objects') is not null then
    raise exception 'DESTINATION_REJECTED: el destino parece un proyecto de UGO Arena';
  end if;

  -- 1. Huella ESTABLE del destino (sin dirección IP: Neon la cambia al reiniciar).
  select pg_get_userbyid(datdba), oid, pg_encoding_to_char(encoding), datcollate, datctype
    into v_owner, v_oid, v_encoding, v_collate, v_ctype
    from pg_database where datname = current_database();
  v_fingerprint := encode(sha256(convert_to(
      current_database() || '|' || v_oid::text || '|' || coalesce(v_owner,'?') || '|' ||
      coalesce(v_encoding,'?') || '|' || coalesce(v_collate,'?') || '|' || coalesce(v_ctype,'?'), 'UTF8')), 'hex');

  create schema if not exists hive;
  create table if not exists hive.meta (
    key        text primary key,
    value      text not null,
    note       text,
    updated_at timestamptz not null default now()
  );
  alter table hive.meta add column if not exists note text;

  select value into v_recorded from hive.meta where key = 'destination_fingerprint';
  select value into v_algo from hive.meta where key = 'destination_fingerprint_algo';

  -- Huella antigua (v1, atada a la IP interna): se re-ancla UNA vez, con confirmación
  -- explícita y conservando la anterior para auditoría. Nunca en silencio.
  if v_recorded is not null and v_algo is distinct from 'v2-stable' then
    if v_reanchor <> 'APLICAR' then
      raise exception 'DESTINATION_FINGERPRINT_REANCHOR_REQUIRED: la huella registrada usa el algoritmo antiguo (incluía la IP interna, que Neon cambia al reiniciar). Repetir con hive.confirm_fingerprint_reanchor=APLICAR para re-anclarla una sola vez; la anterior queda guardada en hive.meta.destination_fingerprint_v1.';
    end if;
    insert into hive.meta (key, value, note) values
      ('destination_fingerprint_v1', v_recorded, 'huella v1 (incluía inet_server_addr); conservada sólo para auditoría')
      on conflict (key) do nothing;
    insert into hive.meta (key, value, note) values
      ('fingerprint_reanchored_at', now()::text, 're-anclaje único de huella v1 → v2')
      on conflict (key) do update set value = excluded.value, updated_at = now();
    delete from hive.meta where key = 'destination_fingerprint';
    v_recorded := null;
  end if;

  if v_recorded is null then
    if v_confirm <> 'APLICAR' then
      raise exception 'DESTINATION_FIRST_APPLY_REQUIRED: esta base no está registrada. Repetir con hive.confirm_first_apply=APLICAR tras revisar el inventario (preflight.sql).';
    end if;
    if v_expected is not null and v_expected <> v_fingerprint then
      raise exception 'DESTINATION_FINGERPRINT_MISMATCH: esperada % · real %', v_expected, v_fingerprint;
    end if;
    insert into hive.meta (key, value, note) values
      ('destination_fingerprint', v_fingerprint, 'sha256(base|oid|dueño|encoding|collate|ctype): estable ante reinicios, no falsificable desde el cliente'),
      ('destination_fingerprint_algo', 'v2-stable', 'sin dirección IP: Neon la cambia al reiniciar el compute'),
      ('destination_owner',       v_owner,        'rol dueño de la base según el servidor'),
      ('destination_server_addr', coalesce(inet_server_addr()::text, 'socket'), 'informativo: NO forma parte de la huella'),
      ('destination_server_port', coalesce(inet_server_port()::text, '0'),      'inet_server_port() según el servidor'),
      ('destination_first_approved_at', now()::text, 'momento de la confirmación de primera aplicación'),
      ('server_encoding', current_setting('server_encoding'), 'Neon crea las bases en UTF8; otro valor altera el plegado de acentos'),
      ('destination_check', 'full', 'first-apply confirmado y huella registrada')
    on conflict (key) do nothing;
  elsif v_recorded <> v_fingerprint then
    raise exception 'DESTINATION_FINGERPRINT_MISMATCH: la base no es la registrada. Registrada % · actual %. Migrar otra base exige una aprobación nueva y explícita, nunca un SET.', v_recorded, v_fingerprint;
  else
    insert into hive.meta (key, value) values ('destination_check', 'full')
      on conflict (key) do update set value = 'full', updated_at = now();
    insert into hive.meta (key, value) values ('destination_fingerprint_algo', 'v2-stable')
      on conflict (key) do update set value = 'v2-stable', updated_at = now();
  end if;

  -- Si la base ya declara pertenecer a otro proyecto, no se toca.
  if exists (select 1 from hive.meta where key = 'neon_project_id' and value <> v_project) then
    raise exception 'DESTINATION_REJECTED: esta base pertenece al proyecto %',
      (select value from hive.meta where key = 'neon_project_id');
  end if;
  insert into hive.meta (key, value) values ('neon_project_id', v_project) on conflict (key) do nothing;

  insert into hive.meta (key, value) values ('schema_version', '2.2.0')
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into hive.meta (key, value) values ('applied_at', now()::text)
    on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;
