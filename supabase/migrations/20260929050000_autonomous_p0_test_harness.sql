-- Service-role-only P0 QA harness for the isolated UGO TEST project.
create or replace function public.autonomous_qa_run_p0_test_service()
returns uuid language plpgsql security definer set search_path=public,private,auth,extensions,pg_temp as $$
declare cid constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';pid constant uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';cat uuid;sid uuid;oid uuid;s public.servicios%rowtype;n integer;loc extensions.geography;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';end if;
 select categoria_principal_id,ubicacion into cat,loc from public.perfiles_proveedor where usuario_id=pid;
 if cat is null or loc is null then raise exception 'TEST_PROVIDER_NOT_READY';end if;
 select coalesce(max(numero),0)+1 into n from public.servicios;
 update public.usuarios set es_demo=true where id in(cid,pid);
 update public.perfiles_proveedor set online=true,disponible=true,ubicacion_updated_at=now(),ubicacion_accuracy_m=10 where usuario_id=pid;
 insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
 values(n,cid,cat,'borrador','QA P0 persisted TEST service','UGO TEST',loc,120,jsonb_build_object('qa_p0',true,'payment_method','cash'),'demo') returning id into sid;
 perform set_config('request.jwt.claim.sub',cid::text,true); perform set_config('request.jwt.claim.role','authenticated',true);
 perform * from private.iniciar_matching_impl(sid);
 select id into oid from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente' order by ranking limit 1;
 if oid is null then raise exception 'P0_MATCHING_FAILED';end if;
 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.aceptar_oferta_impl(oid);if s.estado<>'asignado' then raise exception 'P0_ACCEPT_FAILED';end if;
 select * into s from private.avanzar_servicio_impl(sid,'en_camino');
 update public.perfiles_proveedor set ubicacion=loc,ubicacion_updated_at=now(),ubicacion_accuracy_m=10 where usuario_id=pid;
 perform set_config('ugo.arrival_validated_service',sid::text,true); update public.servicios set estado='llegado',updated_at=now() where id=sid and proveedor_id=pid and estado='en_camino'; perform set_config('ugo.arrival_validated_service','',true);
 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)values(sid,pid,'antes','qa/'||sid||'/before.jpg','QA persisted initial evidence','{"qa":true}');
 select * into s from private.avanzar_servicio_impl(sid,'en_progreso');
 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)values(sid,pid,'despues','qa/'||sid||'/after.jpg','QA persisted final evidence','{"qa":true}');
 select * into s from private.avanzar_servicio_impl(sid,'esperando_aprobacion');
 perform set_config('request.jwt.claim.sub',cid::text,true); select * into s from private.aprobar_servicio_impl(sid);
 update public.pagos set fecha_confirmacion=now(),estado='liberado',liberado_at=now(),updated_at=now() where servicio_id=sid and metodo='efectivo';
 update public.servicios set estado='completado',completado_at=now(),updated_at=now() where id=sid and estado='esperando_aprobacion';
 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)values(sid,cid,pid,5,'QA client rating','cliente'),(sid,cid,pid,5,'QA provider rating','proveedor');
 update public.autonomous_qa_scenarios set service_id=sid where scenario_key in('provider-radius','payments','service-lifecycle');
 return sid;
end$$;
revoke all on function public.autonomous_qa_run_p0_test_service() from public,anon,authenticated;grant execute on function public.autonomous_qa_run_p0_test_service() to service_role;