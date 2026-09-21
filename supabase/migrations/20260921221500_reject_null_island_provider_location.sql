-- UGO TEST · hardening GPS de llegada: nunca aceptar Null Island (0,0) como ubicación real.
-- Evita que un navegador/emulador con lectura inválida sobrescriba la última posición
-- del proveedor y provoque falsos "demasiado lejos" contra un pickup válido.

create or replace function public.actualizar_ubicacion_y_distancia(
  p_lat double precision,
  p_lng double precision,
  p_servicio_id uuid default null
)
returns double precision
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_client_location extensions.geography;
  v_distance double precision;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 or p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas inválidas';
  end if;
  if abs(p_lat) < 0.0001 and abs(p_lng) < 0.0001 then
    raise exception 'Ubicación GPS inválida. Activá ubicación precisa y reintentá';
  end if;
  if not exists (select 1 from public.usuarios u where u.id=v_uid and u.tipo='proveedor') then
    raise exception 'Solo proveedores pueden actualizar este tracking';
  end if;

  update public.perfiles_proveedor
     set ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
         updated_at=now()
   where usuario_id=v_uid;
  if not found then raise exception 'Perfil de proveedor no disponible'; end if;

  update public.usuarios set lat=p_lat,lng=p_lng,updated_at=now() where id=v_uid;

  if p_servicio_id is null then return null; end if;

  select coalesce(s.ubicacion_cliente,pc.ubicacion)
    into v_client_location
    from public.servicios s
    left join public.perfiles_cliente pc on pc.usuario_id=s.cliente_id
   where s.id=p_servicio_id
     and s.proveedor_id=v_uid
     and s.estado in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado');
  if not found then raise exception 'Servicio no asignado al proveedor'; end if;
  if v_client_location is null then return null; end if;

  v_distance := extensions.st_distance(
    extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
    v_client_location
  );
  return v_distance;
end;
$$;

revoke all on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) from public;
grant execute on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) to authenticated;

-- Limpia únicamente la coordenada imposible 0,0 ya persistida. No inventa una posición.
update public.perfiles_proveedor
   set ubicacion=null,
       updated_at=now()
 where ubicacion is not null
   and abs(extensions.st_y(ubicacion::extensions.geometry)) < 0.0001
   and abs(extensions.st_x(ubicacion::extensions.geometry)) < 0.0001;

update public.usuarios
   set lat=null,
       lng=null,
       updated_at=now()
 where tipo='proveedor'
   and lat is not null
   and lng is not null
   and abs(lat) < 0.0001
   and abs(lng) < 0.0001;

notify pgrst,'reload schema';
