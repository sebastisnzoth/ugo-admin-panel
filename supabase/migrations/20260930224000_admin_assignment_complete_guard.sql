-- UGO · fail-closed guard for direct/manual provider assignment.
-- Any assignment path must have a complete service, valid provider and persisted payment method.

create or replace function private.guard_complete_provider_assignment()
returns trigger
language plpgsql
security definer
set search_path='public','private','extensions','pg_temp'
as $$
declare
  v_missing text[] := '{}'::text[];
  v_method text;
  v_lat double precision;
  v_lng double precision;
begin
  if new.proveedor_id is null then
    return new;
  end if;

  if new.cliente_id is null then
    v_missing:=array_append(v_missing,'cliente');
  end if;

  if new.categoria_id is null then
    v_missing:=array_append(v_missing,'categoría');
  end if;

  if new.ubicacion_cliente is null then
    v_missing:=array_append(v_missing,'ubicación');
  else
    v_lat:=extensions.st_y(new.ubicacion_cliente::extensions.geometry);
    v_lng:=extensions.st_x(new.ubicacion_cliente::extensions.geometry);
    if v_lat is null or v_lng is null
       or v_lat < -90 or v_lat > 90
       or v_lng < -180 or v_lng > 180
       or (abs(v_lat)<0.0001 and abs(v_lng)<0.0001) then
      v_missing:=array_append(v_missing,'ubicación válida');
    end if;
  end if;

  if not exists(
    select 1
      from public.usuarios u
      join public.perfiles_proveedor pp on pp.usuario_id=u.id
     where u.id=new.proveedor_id
       and u.tipo='proveedor'
       and u.activo=true
       and pp.estado_verificacion='verificado'
  ) then
    v_missing:=array_append(v_missing,'proveedor habilitado');
  end if;

  v_method:=lower(coalesce(
    new.metadata->>'requested_payment_method',
    new.metadata->>'payment_method',
    ''
  ));
  if v_method='cash' then v_method:='efectivo'; end if;
  if v_method not in ('efectivo','pix') then
    v_missing:=array_append(v_missing,'forma de pago');
  end if;

  if array_length(v_missing,1)>0 then
    raise exception 'Asignación bloqueada. Falta completar: %',array_to_string(v_missing,', ');
  end if;

  return new;
end;
$$;

revoke all on function private.guard_complete_provider_assignment() from public,anon,authenticated;

drop trigger if exists trg_guard_complete_provider_assignment on public.servicios;
create trigger trg_guard_complete_provider_assignment
before insert or update of proveedor_id,estado,cliente_id,categoria_id,ubicacion_cliente,metadata
on public.servicios
for each row
execute function private.guard_complete_provider_assignment();

notify pgrst,'reload schema';
