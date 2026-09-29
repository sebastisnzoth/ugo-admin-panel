-- Prevent overlapping UGO TEST Workers from racing the shared P0 provider fixture.
CREATE OR REPLACE FUNCTION public.autonomous_qa_run_p0_test_service()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
 cid constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
 pid constant uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
 cat uuid; sid uuid; oid uuid; s public.servicios%rowtype; loc extensions.geography;
 lat double precision; lng double precision; arrival jsonb; initial_role text; br_cash_old text;
 rejected boolean;
begin
 -- Serialize the shared UGO TEST provider fixture across overlapping Workers.
 -- Transaction-scoped only: no production path or real provider is affected.
 perform pg_advisory_xact_lock(hashtextextended('ugo-test-p0-provider-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',0));
 -- The service_role-only EXECUTE ACL is the entry boundary. Secret keys need no legacy JWT claim.
 initial_role:=coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','');
 -- TEST fixture hygiene: preserve real debt blocking, but prevent historical QA
 -- cash services from poisoning the fixed demo provider across repeated CI runs.
 update public.deudas_ugo_proveedor d
 set estado='anulado',
     notas=concat_ws(' | ',nullif(d.notas,''),'AUTO_QA_P0_FIXTURE_RESET'),
     updated_at=now()
 where d.proveedor_id=pid
   and d.ambiente='demo'
   and d.estado in('pendiente','informado','parcial')
   and exists(
     select 1 from public.servicios qs
     where qs.id=d.servicio_id
       and qs.ambiente='demo'
       and coalesce(qs.metadata->>'qa_p0','false')='true'
   );
 select valor into br_cash_old from public.config_sistema where clave='pago_efectivo_br_activo' for update;
 if br_cash_old is null then raise exception 'TEST_CASH_CONFIG_MISSING'; end if;
 update public.config_sistema set valor='true' where clave='pago_efectivo_br_activo';

 select categoria_principal_id,ubicacion,extensions.st_y(ubicacion::extensions.geometry),extensions.st_x(ubicacion::extensions.geometry)
 into cat,loc,lat,lng from public.perfiles_proveedor where usuario_id=pid;
 if cat is null or loc is null or lat is null or lng is null then raise exception 'TEST_PROVIDER_NOT_READY'; end if;

 perform set_config('request.jwt.claim.sub',pid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform public.publicar_ubicacion_disponibilidad_proveedor(lat,lng,now(),10);

 insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
 values(nextval('public.servicios_numero_seq'),cid,cat,'borrador','QA P0 persisted TEST service','UGO TEST',loc,120,
        jsonb_build_object('qa_p0',true,'payment_method','cash'),'demo') returning id into sid;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 perform * from private.iniciar_matching_impl(sid);
 select id into oid from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente' order by ranking limit 1;
 if oid is null then raise exception 'P0_MATCHING_FAILED'; end if;

 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.aceptar_oferta_impl(oid);
 if s.estado<>'asignado' then raise exception 'P0_ACCEPT_FAILED'; end if;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 perform public.seleccionar_pago_efectivo(sid);

 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.avanzar_servicio_impl(sid,'en_camino');

 -- Invalid publications must fail before changing the service or trusted GPS.
 rejected:=false;
 begin
   perform public.publicar_ubicacion_proveedor(sid,0,0,now(),10);
 exception when others then
   if sqlerrm not like '%0,0%' then raise; end if;
   rejected:=true;
 end;
 if not rejected then raise exception 'P0_ZERO_GPS_ACCEPTED'; end if;
 rejected:=false;
 begin
   perform public.publicar_ubicacion_proveedor(sid,lat,lng,now()-interval '1 minute',10);
 exception when others then
   if sqlerrm not like '%antigua%' then raise; end if;
   rejected:=true;
 end;
 if not rejected then raise exception 'P0_STALE_GPS_ACCEPTED'; end if;
 rejected:=false;
 begin
   perform public.publicar_ubicacion_proveedor(sid,lat,lng,now(),999);
 exception when others then
   if sqlerrm not like '%Precisión GPS%' then raise; end if;
   rejected:=true;
 end;
 if not rejected then raise exception 'P0_INACCURATE_GPS_ACCEPTED'; end if;
 if (select estado from public.servicios where id=sid)<>'en_camino' then
   raise exception 'P0_REJECTED_GPS_CHANGED_STATE';
 end if;

 -- A fresh but distant fix is accepted for tracking; arrival must reject it.
 perform public.publicar_ubicacion_proveedor(sid,lat+0.01,lng,now(),10);
 arrival:=public.marcar_llegada_proveedor(sid);
 if arrival->>'status'<>'rejected' or arrival->>'code'<>'outside_geofence'
    or coalesce((arrival->>'distance_m')::numeric,0)<=200 then
   raise exception 'P0_OUTSIDE_GEOFENCE_NOT_REJECTED:%',arrival;
 end if;
 if (select estado from public.servicios where id=sid)<>'en_camino'
    or exists(select 1 from public.servicio_estado_eventos
       where servicio_id=sid and estado_nuevo='llegado') then
   raise exception 'P0_REJECTED_ARRIVAL_CHANGED_STATE';
 end if;

 perform public.publicar_ubicacion_proveedor(sid,lat,lng,now(),10);
 arrival:=public.marcar_llegada_proveedor(sid);
 if arrival->>'status'<>'arrived' or arrival->>'previous_state'<>'en_camino'
    or arrival->>'state'<>'llegado'
    or coalesce((arrival->>'distance_m')::numeric,999999)>200 then
   raise exception 'P0_ARRIVAL_FAILED:%',arrival;
 end if;

 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)
 values(sid,pid,'antes','qa/'||sid||'/before.jpg','QA persisted initial evidence','{"qa":true,"phase":"before"}');
 select * into s from private.avanzar_servicio_impl(sid,'en_progreso');
 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)
 values(sid,pid,'despues','qa/'||sid||'/after.jpg','QA persisted final evidence','{"qa":true,"phase":"after"}');
 select * into s from private.avanzar_servicio_impl(sid,'esperando_aprobacion');

 perform set_config('request.jwt.claim.sub',cid::text,true);
 select * into s from private.aprobar_servicio_impl(sid);
 select * into s from public.confirmar_pago_efectivo_cliente(sid);
 if s.estado<>'completado' then raise exception 'P0_CASH_COMPLETION_FAILED'; end if;

 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)
 values(sid,cid,pid,5,'QA client rating','cliente');
 perform set_config('request.jwt.claim.sub',pid::text,true);
 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)
 values(sid,cid,pid,5,'QA provider rating','proveedor');

 update public.autonomous_qa_scenarios set service_id=sid where scenario_key in('provider-radius','payments','service-lifecycle');
 update public.config_sistema set valor=br_cash_old where clave='pago_efectivo_br_activo';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 return sid;
end;$function$;

revoke all on function public.autonomous_qa_run_p0_test_service() from public,anon,authenticated;
grant execute on function public.autonomous_qa_run_p0_test_service() to service_role;
