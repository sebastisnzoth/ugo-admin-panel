-- UGO P0 Cliente · mantener la dirección del onboarding disponible como lugar.
-- El backfill original era puntual; los clientes creados después podían quedar
-- con perfiles_cliente.direccion pero sin ninguna fila en direcciones_cliente.

create or replace function private.ensure_client_profile_default_place()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  if nullif(trim(coalesce(new.direccion,'')),'') is null then return new; end if;
  if exists(select 1 from public.direcciones_cliente dc where dc.usuario_id=new.usuario_id) then return new; end if;

  if new.ubicacion is not null then
    v_lat := extensions.st_y(new.ubicacion::extensions.geometry);
    v_lng := extensions.st_x(new.ubicacion::extensions.geometry);
  else
    select u.lat,u.lng into v_lat,v_lng from public.usuarios u where u.id=new.usuario_id;
  end if;

  insert into public.direcciones_cliente(usuario_id,etiqueta,direccion,barrio,ciudad,latitud,longitud,es_predeterminada)
  values(new.usuario_id,'Casa',trim(new.direccion),new.barrio,new.ciudad,
    case when v_lat between -90 and 90 then v_lat else null end,
    case when v_lng between -180 and 180 then v_lng else null end,true)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.ensure_client_profile_default_place() from public,anon,authenticated;
drop trigger if exists trg_ensure_client_profile_default_place on public.perfiles_cliente;
create trigger trg_ensure_client_profile_default_place
after insert or update of direccion,barrio,ciudad on public.perfiles_cliente
for each row execute function private.ensure_client_profile_default_place();

insert into public.direcciones_cliente(usuario_id,etiqueta,direccion,barrio,ciudad,latitud,longitud,es_predeterminada)
select pc.usuario_id,'Casa',trim(pc.direccion),pc.barrio,pc.ciudad,
  case when pc.ubicacion is not null then extensions.st_y(pc.ubicacion::extensions.geometry) when u.lat between -90 and 90 then u.lat else null end,
  case when pc.ubicacion is not null then extensions.st_x(pc.ubicacion::extensions.geometry) when u.lng between -180 and 180 then u.lng else null end,
  true
from public.perfiles_cliente pc
join public.usuarios u on u.id=pc.usuario_id
where nullif(trim(pc.direccion),'') is not null
  and not exists(select 1 from public.direcciones_cliente dc where dc.usuario_id=pc.usuario_id)
on conflict do nothing;

notify pgrst,'reload schema';
