-- UGO TEST QA · combined provider proximity/matching eligibility proof.
-- Service-role only. Creates demo fixtures, validates current backend predicates, then restores state.

create or replace function public.autonomous_qa_proximity_matching()
returns jsonb
language plpgsql
security definer
set search_path='public','private','auth','extensions','pg_temp'
as $$
declare
  pid constant uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  cid constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  provider_cat uuid;
  mismatch_cat uuid;
  ploc extensions.geography;
  farloc extensions.geography;
  plat double precision;
  plng double precision;
  old_radius numeric;
  old_online boolean;
  old_disponible boolean;
  old_updated timestamptz;
  old_accuracy double precision;
  initial_sub text:=coalesce(current_setting('request.jwt.claim.sub',true),'');
  initial_role text:=coalesce(current_setting('request.jwt.claim.role',true),'');
  sid uuid;
  service_ids uuid[]:='{}'::uuid[];
  baseline_count integer:=0;
  offline_count integer:=0;
  stale_count integer:=0;
  outside_radius_count integer:=0;
  inside_radius_count integer:=0;
  mismatch_count integer:=0;
  matching_def text;
  debt_guard_present boolean;
  schedule_guard_present boolean;
  verification_guard_present boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-proximity-matching-runtime',0));

  select pp.categoria_principal_id,pp.ubicacion,pp.zona_radio_km,pp.online,pp.disponible,
         pp.ubicacion_updated_at,pp.ubicacion_accuracy_m,
         extensions.st_y(pp.ubicacion::extensions.geometry),
         extensions.st_x(pp.ubicacion::extensions.geometry)
    into provider_cat,ploc,old_radius,old_online,old_disponible,old_updated,old_accuracy,plat,plng
  from public.perfiles_proveedor pp
  where pp.usuario_id=pid
  for update;

  if provider_cat is null or ploc is null or plat is null or plng is null then
    raise exception 'PROXIMITY_TEST_PROVIDER_NOT_READY';
  end if;

  select c.id into mismatch_cat
  from public.categorias c
  where c.activa=true
    and c.id<>provider_cat
    and not private.proveedor_trabaja_categoria(pid,c.id)
  order by c.nombre
  limit 1;
  if mismatch_cat is null then raise exception 'PROXIMITY_MISMATCH_CATEGORY_REQUIRED'; end if;

  farloc:=extensions.st_project(ploc,10000,pi()/2);

  select pg_get_functiondef('private.iniciar_matching_impl(uuid)'::regprocedure) into matching_def;
  debt_guard_present:=position('private.proveedor_bloqueado_por_deuda_ugo(u.id)' in matching_def)>0;
  schedule_guard_present:=position('private.proveedor_puede_recibir_oferta(u.id,p_servicio_id)' in matching_def)>0;
  verification_guard_present:=position('pp.estado_verificacion=''verificado''' in matching_def)>0;
  if not debt_guard_present then raise exception 'PROXIMITY_DEBT_GUARD_MISSING'; end if;
  if not schedule_guard_present then raise exception 'PROXIMITY_SCHEDULE_GUARD_MISSING'; end if;
  if not verification_guard_present then raise exception 'PROXIMITY_VERIFICATION_GUARD_MISSING'; end if;

  -- Baseline: same category, online, fresh GPS, within configured 15 km.
  perform set_config('request.jwt.claim.sub',pid::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  update public.perfiles_proveedor set zona_radio_km=15,online=true,disponible=true where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);

  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,provider_cat,'borrador','QA proximity baseline','UGO TEST',ploc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_runtime":true}'::jsonb,'demo')
  returning id into sid;
  service_ids:=array_append(service_ids,sid);
  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching(sid);
  select count(*) into baseline_count from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if baseline_count<>1 then raise exception 'PROXIMITY_BASELINE_PROVIDER_NOT_MATCHED'; end if;

  -- Offline providers cannot receive a new offer.
  perform set_config('request.jwt.claim.sub',pid::text,true);
  update public.perfiles_proveedor set online=false,disponible=false where usuario_id=pid;
  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,provider_cat,'borrador','QA proximity offline','UGO TEST',ploc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_runtime":true}'::jsonb,'demo')
  returning id into sid;
  service_ids:=array_append(service_ids,sid);
  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching(sid);
  select count(*) into offline_count from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if offline_count<>0 then raise exception 'PROXIMITY_OFFLINE_PROVIDER_MATCHED'; end if;

  -- Fresh trusted location is mandatory.
  perform set_config('request.jwt.claim.sub',pid::text,true);
  update public.perfiles_proveedor set online=true,disponible=true where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);
  perform set_config('ugo.trusted_provider_location',pid::text,true);
  update public.perfiles_proveedor set ubicacion_updated_at=now()-interval '2 minutes' where usuario_id=pid;
  perform set_config('ugo.trusted_provider_location','',true);

  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,provider_cat,'borrador','QA proximity stale GPS','UGO TEST',ploc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_runtime":true}'::jsonb,'demo')
  returning id into sid;
  service_ids:=array_append(service_ids,sid);
  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching(sid);
  select count(*) into stale_count from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if stale_count<>0 then raise exception 'PROXIMITY_STALE_GPS_PROVIDER_MATCHED'; end if;

  -- Provider-specific radius must affect automatic matching.
  perform set_config('request.jwt.claim.sub',pid::text,true);
  update public.perfiles_proveedor set zona_radio_km=5 where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);
  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,provider_cat,'borrador','QA proximity radius 5','UGO TEST',farloc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_runtime":true}'::jsonb,'demo')
  returning id into sid;
  service_ids:=array_append(service_ids,sid);
  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching(sid);
  select count(*) into outside_radius_count from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if outside_radius_count<>0 then raise exception 'PROXIMITY_OUTSIDE_CONFIGURED_RADIUS_MATCHED'; end if;

  perform set_config('request.jwt.claim.sub',pid::text,true);
  update public.perfiles_proveedor set zona_radio_km=15 where usuario_id=pid;
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);
  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,provider_cat,'borrador','QA proximity radius 15','UGO TEST',farloc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_runtime":true}'::jsonb,'demo')
  returning id into sid;
  service_ids:=array_append(service_ids,sid);
  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching(sid);
  select count(*) into inside_radius_count from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if inside_radius_count<>1 then raise exception 'PROXIMITY_INSIDE_CONFIGURED_RADIUS_NOT_MATCHED'; end if;

  -- A category the provider does not work must never create an offer for that provider.
  perform set_config('request.jwt.claim.sub',pid::text,true);
  perform public.publicar_ubicacion_disponibilidad_proveedor(plat,plng,now(),10);
  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),cid,mismatch_cat,'borrador','QA proximity category mismatch','UGO TEST',ploc,120,
    '{"requested_payment_method":"pix","payment_method":"pix","payment_selected_before_order":true,"proximity_runtime":true}'::jsonb,'demo')
  returning id into sid;
  service_ids:=array_append(service_ids,sid);
  perform set_config('request.jwt.claim.sub',cid::text,true);
  perform * from public.iniciar_matching(sid);
  select count(*) into mismatch_count from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente';
  if mismatch_count<>0 then raise exception 'PROXIMITY_WRONG_CATEGORY_PROVIDER_MATCHED'; end if;

  delete from public.notificaciones n where n.datos->>'servicio_id'=any(select unnest(service_ids)::text);
  delete from public.ofertas_servicio where servicio_id=any(service_ids);
  delete from public.servicios where id=any(service_ids);

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
    'baseline_offer_count',baseline_count,
    'offline_offer_count',offline_count,
    'stale_gps_offer_count',stale_count,
    'outside_radius_offer_count',outside_radius_count,
    'inside_radius_offer_count',inside_radius_count,
    'wrong_category_offer_count',mismatch_count,
    'debt_guard_present',debt_guard_present,
    'schedule_guard_present',schedule_guard_present,
    'verification_guard_present',verification_guard_present,
    'cleanup_ok',true
  );
exception when others then
  if array_length(service_ids,1)>0 then
    delete from public.notificaciones n where n.datos->>'servicio_id'=any(select unnest(service_ids)::text);
    delete from public.ofertas_servicio where servicio_id=any(service_ids);
    delete from public.servicios where id=any(service_ids);
  end if;
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
revoke all on function public.autonomous_qa_proximity_matching() from public,anon,authenticated;
grant execute on function public.autonomous_qa_proximity_matching() to service_role;

notify pgrst,'reload schema';
