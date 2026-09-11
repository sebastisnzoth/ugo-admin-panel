-- UGO · Integridad temporal de evidencia operacional.
--
-- Evita que una foto "Después" pueda cargarse antes de iniciar el trabajo y luego
-- reutilizarse para cerrar un servicio. La evidencia debe representar el estado
-- real del servicio en el momento en que se registra.
--
-- Contrato:
--   llegado              -> antes
--   en_progreso          -> durante | despues
--   esperando_aprobacion -> despues (sólo recuperación de casos históricos)
--
-- `documento` queda fuera de este guard porque puede pertenecer a flujos
-- documentales independientes; sigue protegido por RLS.

create or replace function private.guard_service_evidence_state()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
begin
  select * into v_servicio
  from public.servicios
  where id = new.servicio_id;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if new.usuario_id is distinct from v_servicio.proveedor_id then
    raise exception 'Sólo el proveedor asignado puede registrar evidencia operacional';
  end if;

  if nullif(btrim(coalesce(new.storage_path,'')),'') is null then
    raise exception 'La evidencia necesita un archivo válido';
  end if;

  if new.tipo = 'antes' and v_servicio.estado <> 'llegado' then
    raise exception 'La evidencia Antes sólo puede registrarse después de llegar y antes de iniciar';
  end if;

  if new.tipo = 'durante' and v_servicio.estado <> 'en_progreso' then
    raise exception 'La evidencia Durante sólo puede registrarse con el trabajo en curso';
  end if;

  if new.tipo = 'despues' and v_servicio.estado not in ('en_progreso','esperando_aprobacion') then
    raise exception 'La evidencia Después sólo puede registrarse al finalizar el trabajo';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_service_evidence_state() from public, anon;
grant execute on function private.guard_service_evidence_state() to authenticated, service_role;

drop trigger if exists trg_guard_service_evidence_state on public.evidencias_servicio;
create trigger trg_guard_service_evidence_state
before insert or update of servicio_id, usuario_id, tipo, storage_path
on public.evidencias_servicio
for each row
execute function private.guard_service_evidence_state();
