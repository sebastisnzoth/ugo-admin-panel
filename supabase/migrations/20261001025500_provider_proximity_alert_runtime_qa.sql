-- UGO TEST QA · provider proximity alert obeys configured provider radius.
create or replace function public.autonomous_qa_provider_proximity_alert()
returns jsonb
language plpgsql
security definer
set search_path='public','private','auth','extensions','pg_temp'
as $$
declare
  pid constant uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  cid constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  cat uuid;
  ploc extensions.geography;
  testloc extensions.geography;
  plat double precision;
  plng double precision;
  old_radius numeric;
  old_online boolean;
  old_disponible boolean;
  old_updated timestamptz;
  old_accuracy double precision;
  sid uuid;
  oid uuid;
  outside_count integer:=0;
  inside_count integer:=0;
  outside_radius_reported numeric;
  inside_radius_reported numeric;
  initial_sub text:=coalesce(current_setting('request.jwt.claim.sub',true),'');
  initial_role text:=coalesce(current_setting('request.jwt.claim.role',true),'');
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-provider-proximity-alert-runtime',0));
  select categoria_principal_id,ubicacion,zona_radio_km,online,disponible,ubicacion_updated_at,ubicacion_accuracy_m,
         extensions.st_y(ubicacion::extensions.geometry),extensions.st_x(ubicacion::extensions.geometry)
    into cat,ploc,old_radius,old_online,old_disponible,old_updated,old_accuracy,plat,plng
  from public.perfiles_proveedor where usuario_id=pid for update;
  if cat is null or ploc is null then raise exception 'ALERT_TEST_PROVIDER_NOT_READY'; end if;
  testloc:=extensions.st_project(ploc,10000,pi()/2);

  perform set_config('request.jwt.claim.sub',pid::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  update public.perfiles_proveedor set zona_radio_km=5,online=true,disponible=true where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);

  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,cat,'borrador','QA alert radius outside','UGO TEST',testloc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_alert_runtime":true}'::jsonb,'demo')
  returning id into sid;

  insert into public.ofertas_servicio(servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at)
  values(sid,pid,'pendiente',1,10.00,120,now()+interval '5 minutes')
  returning id into oid;

  select count(*),max((datos->>'radio_max_km')::numeric)
    into outside_count,outside_radius_reported
  from public.notificaciones
  where usuario_id=pid and datos->>'oferta_id'=oid::text;
  if outside_count<>0 then raise exception 'OUTSIDE_RADIUS_ALERT_MUST_BE_SUPPRESSED'; end if;

  delete from public.ofertas_servicio where id=oid;
  delete from public.servicios where id=sid;

  perform set_config('request.jwt.claim.sub',pid::text,true);
  update public.perfiles_proveedor set zona_radio_km=15 where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);

  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,cat,'borrador','QA alert radius inside','UGO TEST',testloc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_alert_runtime":true}'::jsonb,'demo')
  returning id into sid;

  insert into public.ofertas_servicio(servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at)
  values(sid,pid,'pendiente',1,10.00,120,now()+interval '5 minutes')
  returning id into oid;

  select count(*),max((datos->>'radio_max_km')::numeric)
    into inside_count,inside_radius_reported
  from public.notificaciones
  where usuario_id=pid and datos->>'oferta_id'=oid::text;

  if inside_count<>1 then raise exception 'INSIDE_RADIUS_ALERT_MUST_BE_CREATED_ONCE'; end if;
  if inside_radius_reported<>15 then raise exception 'ALERT_MUST_REPORT_PROVIDER_RADIUS'; end if;

  delete from public.notificaciones where usuario_id=pid and datos->>'oferta_id'=oid::text;
  delete from public.ofertas_servicio where id=oid;
  delete from public.servicios where id=sid;

  perform set_config('request.jwt.claim.sub',pid::text,true);
  perform set_config('ugo.trusted_provider_location',pid::text,true);
  update public.perfiles_proveedor
     set zona_radio_km=old_radius,online=old_online,disponible=old_disponible,
         ubicacion_updated_at=old_updated,ubicacion_accuracy_m=old_accuracy
   where usuario_id=pid;
  perform set_config('ugo.trusted_provider_location','',true);
  perform set_config('request.jwt.claim.sub',initial_sub,true);
  perform set_config('request.jwt.claim.role',initial_role,true);

  return jsonb_build_object(
    'test_distance_km',10,
    'outside_radius_km',5,
    'outside_alert_count',outside_count,
    'inside_radius_km',15,
    'inside_alert_count',inside_count,
    'inside_reported_radius_km',inside_radius_reported,
    'cleanup_ok',true
  );
exception when others then
  if oid is not null then delete from public.notificaciones where usuario_id=pid and datos->>'oferta_id'=oid::text; delete from public.ofertas_servicio where id=oid; end if;
  if sid is not null then delete from public.servicios where id=sid; end if;
  perform set_config('request.jwt.claim.sub',pid::text,true);
  perform set_config('ugo.trusted_provider_location',pid::text,true);
  update public.perfiles_proveedor
     set zona_radio_km=old_radius,online=old_online,disponible=old_disponible,
         ubicacion_updated_at=old_updated,ubicacion_accuracy_m=old_accuracy
   where usuario_id=pid;
  perform set_config('ugo.trusted_provider_location','',true);
  perform set_config('request.jwt.claim.sub',initial_sub,true);
  perform set_config('request.jwt.claim.role',initial_role,true);
  raise;
end
$$;
revoke all on function public.autonomous_qa_provider_proximity_alert() from public,anon,authenticated;
grant execute on function public.autonomous_qa_provider_proximity_alert() to service_role;
notify pgrst,'reload schema';
