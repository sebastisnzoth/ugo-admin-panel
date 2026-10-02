-- UGO TEST/runtime hardening: keep provider radius QA isolated from active immediate client orders.
-- The QA service is scheduled in the future so the client concurrency guard does not block this probe.

create or replace function public.autonomous_qa_provider_operating_radius()
returns jsonb
language plpgsql
security definer
set search_path='public','private','auth','extensions','pg_temp'
as $$
declare
  pid constant uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  cid constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  cat uuid;
  sid uuid;
  ploc extensions.geography;
  testloc extensions.geography;
  plat double precision;
  plng double precision;
  old_radius numeric;
  old_online boolean;
  old_disponible boolean;
  old_updated timestamptz;
  old_accuracy double precision;
  initial_sub text:=coalesce(current_setting('request.jwt.claim.sub',true),'');
  initial_role text:=coalesce(current_setting('request.jwt.claim.role',true),'');
  rejected boolean:=false;
  small_count integer:=0;
  large_count integer:=0;
  dist_km numeric;
  result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-provider-operating-radius-runtime',0));

  select categoria_principal_id,ubicacion,zona_radio_km,online,disponible,ubicacion_updated_at,ubicacion_accuracy_m,
         extensions.st_y(ubicacion::extensions.geometry),
         extensions.st_x(ubicacion::extensions.geometry)
    into cat,ploc,old_radius,old_online,old_disponible,old_updated,old_accuracy,plat,plng
  from public.perfiles_proveedor
  where usuario_id=pid
  for update;

  if cat is null or ploc is null or plat is null or plng is null then raise exception 'TEST_PROVIDER_LOCATION_OR_CATEGORY_MISSING'; end if;
  testloc:=extensions.st_project(ploc,10000,pi()/2);
  dist_km:=round((extensions.st_distance(ploc,testloc)/1000.0)::numeric,2);

  perform set_config('request.jwt.claim.sub',pid::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  update public.perfiles_proveedor set zona_radio_km=5,online=true,disponible=true where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);

  insert into public.servicios(
    numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente,programado_para
  ) values(
    nextval('public.servicios_numero_seq'),cid,cat,'borrador','UGO TEST configurable provider radius',
    'UGO TEST radius boundary',testloc,120,
    jsonb_build_object('requested_payment_method','pix','payment_method','pix','payment_selected_before_order',true,'radius_runtime',true),
    'demo',now()+interval '1 day'
  ) returning id into sid;

  perform set_config('request.jwt.claim.sub',cid::text,true);
  begin
    perform * from public.iniciar_matching_dirigido(sid,pid);
  exception when others then
    if sqlerrm not like '%radio operativo configurado%' then raise; end if;
    rejected:=true;
  end;

  select count(*) into small_count
  from public.ofertas_servicio
  where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if not rejected or small_count<>0 then raise exception 'SMALL_RADIUS_MUST_REJECT'; end if;

  perform set_config('request.jwt.claim.sub',pid::text,true);
  update public.perfiles_proveedor set zona_radio_km=15 where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);

  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching_dirigido(sid,pid);

  select count(*) into large_count
  from public.ofertas_servicio
  where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if large_count<>1 then raise exception 'LARGE_RADIUS_MUST_ALLOW'; end if;

  result:=jsonb_build_object(
    'small_radius_km',5,
    'large_radius_km',15,
    'test_distance_km',dist_km,
    'small_radius_rejected',rejected,
    'small_radius_offer_count',small_count,
    'large_radius_offer_count',large_count
  );

  delete from public.notificaciones where datos->>'servicio_id'=sid::text;
  delete from public.ofertas_servicio where servicio_id=sid;
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

  return result||jsonb_build_object('cleanup_ok',true);
end
$$;
revoke all on function public.autonomous_qa_provider_operating_radius() from public,anon,authenticated;
grant execute on function public.autonomous_qa_provider_operating_radius() to service_role;


notify pgrst,'reload schema';
