-- UGO · direct Admin assignment from draft must become an assigned job.
create or replace function private.normalize_service_provider_assignment()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if new.proveedor_id is null then
    return new;
  end if;

  if new.estado::text in ('borrador','buscando','ofrecido') then
    new.estado='asignado'::public.servicio_estado;
    new.aceptado_at=coalesce(new.aceptado_at,now());
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_service_provider_assignment() from public,anon,authenticated;

notify pgrst,'reload schema';
