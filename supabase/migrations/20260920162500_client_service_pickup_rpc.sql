-- UGO TEST · snapshot de ubicación del Cliente por serviceId.
create or replace function public.guardar_ubicacion_servicio_cliente(
  p_servicio_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_estado text;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if p_lat is null or p_lat < -90 or p_lat > 90
     or p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas inválidas';
  end if;

  select s.estado into v_estado
    from public.servicios s
   where s.id = p_servicio_id
     and s.cliente_id = v_uid
   for update;

  if not found then raise exception 'Servicio no disponible'; end if;
  if v_estado in ('completado','cancelado','rechazado') then
    raise exception 'El servicio ya no admite cambios de ubicación';
  end if;

  update public.servicios
     set ubicacion_cliente =
       extensions.st_setsrid(
         extensions.st_makepoint(p_lng,p_lat),
         4326
       )::extensions.geography,
         updated_at = now()
   where id = p_servicio_id
     and cliente_id = v_uid;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values(
    'cliente_ubicacion_servicio_guardada',
    v_uid,
    'servicio',
    p_servicio_id,
    jsonb_build_object('source','client_dispatch_pickup')
  );
end;
$$;

revoke all on function public.guardar_ubicacion_servicio_cliente(uuid,double precision,double precision) from public,anon;
grant execute on function public.guardar_ubicacion_servicio_cliente(uuid,double precision,double precision) to authenticated;

comment on function public.guardar_ubicacion_servicio_cliente(uuid,double precision,double precision) is
  'Guarda el snapshot GPS del Cliente en el serviceId exacto antes del matching. Valida ownership y coordenadas.';

notify pgrst,'reload schema';
