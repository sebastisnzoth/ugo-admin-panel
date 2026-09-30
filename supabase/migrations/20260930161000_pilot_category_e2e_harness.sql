-- UGO Pilot · service-role-only end-to-end harness for Faxina and Marido de Aluguel.
-- Runs exclusively against isolated UGO TEST and reuses production business RPC paths.
create or replace function public.pilot_qa_run_category_e2e(p_slug text)
returns uuid
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
 cid constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
 pid constant uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
 cat uuid; cat_name text; sid uuid; oid uuid; s public.servicios%rowtype; loc extensions.geography;
 lat double precision; lng double precision; arrival jsonb; initial_role text; br_cash_old text;
 old_primary uuid; old_categories uuid[]; old_category_name text; pilot_details jsonb;
begin
 initial_role:=coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','');
 if initial_role<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
 if p_slug not in ('faxina','marido-de-aluguel') then raise exception 'PILOT_CATEGORY_REQUIRED'; end if;
 select id,nombre into cat,cat_name from public.categorias where slug=p_slug and activa=true;
 if cat is null then raise exception 'PILOT_CATEGORY_NOT_ACTIVE:%',p_slug; end if;

 select valor into br_cash_old from public.config_sistema where clave='pago_efectivo_br_activo' for update;
 if br_cash_old is null then raise exception 'TEST_CASH_CONFIG_MISSING'; end if;
 select p.categoria_principal_id,u.categorias_ids,u.categoria,p.ubicacion,
        extensions.st_y(p.ubicacion::extensions.geometry),extensions.st_x(p.ubicacion::extensions.geometry)
 into old_primary,old_categories,old_category_name,loc,lat,lng
 from public.perfiles_proveedor p join public.usuarios u on u.id=p.usuario_id where p.usuario_id=pid;
 if loc is null or lat is null or lng is null then raise exception 'TEST_PROVIDER_NOT_READY'; end if;

 update public.config_sistema set valor='true' where clave='pago_efectivo_br_activo';
 update public.perfiles_proveedor set categoria_principal_id=cat,online=true,disponible=true,updated_at=now() where usuario_id=pid;
 update public.usuarios set categorias_ids=array[cat],categoria=cat_name,updated_at=now() where id=pid;

 pilot_details:=case when p_slug='faxina' then jsonb_build_object(
   'serviceType','Profunda','propertyType','Apartamento','bedrooms','2','bathrooms','2','sizeM2','75',
   'pets','Sí · gato','stairs','Ascensor','productsBy','Profesional','equipmentBy','Profesional','accessNotes','Portería TEST')
 else jsonb_build_object(
   'serviceType','Instalar estantes','itemCount','2','room','Sala','materials','Ya los tengo',
   'height','Hasta 2 m','toolsNotes','Taladro y nivel')
 end;

 perform set_config('request.jwt.claim.sub',pid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform public.publicar_ubicacion_disponibilidad_proveedor(lat,lng,now(),10);

 insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,metadata,ambiente)
 values(nextval('public.servicios_numero_seq'),cid,cat,'borrador',
        case when p_slug='faxina' then 'Faxina profunda piloto UGO TEST' else 'Instalar dos estantes piloto UGO TEST' end,
        'UGO TEST · Canasvieiras',loc,120,
        jsonb_build_object('qa_p0',true,'pilot_e2e',true,'pilot_kind',case when p_slug='faxina' then 'faxina' else 'marido' end,
          'pilot_details',pilot_details,'preferences',pilot_details::text,'payment_method','cash'),'demo')
 returning id into sid;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 perform * from private.iniciar_matching_impl(sid);
 select id into oid from public.ofertas_servicio where servicio_id=sid and proveedor_id=pid and estado='pendiente' order by ranking limit 1;
 if oid is null then raise exception 'PILOT_MATCHING_FAILED:%',p_slug; end if;

 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.aceptar_oferta_impl(oid);
 if s.estado<>'asignado' then raise exception 'PILOT_ACCEPT_FAILED:%',p_slug; end if;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 perform public.seleccionar_pago_efectivo(sid);

 perform set_config('request.jwt.claim.sub',pid::text,true);
 select * into s from private.avanzar_servicio_impl(sid,'en_camino');
 perform public.publicar_ubicacion_proveedor(sid,lat,lng,now(),10);
 arrival:=public.marcar_llegada_proveedor(sid);
 if arrival->>'status'<>'arrived' then raise exception 'PILOT_ARRIVAL_FAILED:%',arrival; end if;

 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)
 values(sid,pid,'antes','qa/pilot/'||sid||'/before.jpg','Pilot persisted initial evidence',jsonb_build_object('qa',true,'phase','before','pilot_slug',p_slug));
 select * into s from private.avanzar_servicio_impl(sid,'en_progreso');

 update public.servicios
 set metadata=metadata||jsonb_build_object('scope_change',jsonb_build_object('status','none_required','checked_at',now(),'approved',true))
 where id=sid;

 insert into public.evidencias_servicio(servicio_id,usuario_id,tipo,storage_path,descripcion,metadata)
 values(sid,pid,'despues','qa/pilot/'||sid||'/after.jpg','Pilot persisted final evidence',jsonb_build_object('qa',true,'phase','after','pilot_slug',p_slug));
 select * into s from private.avanzar_servicio_impl(sid,'esperando_aprobacion');

 perform set_config('request.jwt.claim.sub',cid::text,true);
 select * into s from private.aprobar_servicio_impl(sid);
 select * into s from public.confirmar_pago_efectivo_cliente(sid);
 if s.estado<>'completado' then raise exception 'PILOT_CASH_COMPLETION_FAILED:%',p_slug; end if;

 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)
 values(sid,cid,pid,5,'Pilot client rating','cliente');
 perform set_config('request.jwt.claim.sub',pid::text,true);
 insert into public.resenas(servicio_id,cliente_id,proveedor_id,puntuacion,comentario,autor_tipo)
 values(sid,cid,pid,5,'Pilot provider rating','proveedor');

 update public.perfiles_proveedor set categoria_principal_id=old_primary,updated_at=now() where usuario_id=pid;
 update public.usuarios set categorias_ids=old_categories,categoria=old_category_name,updated_at=now() where id=pid;
 update public.config_sistema set valor=br_cash_old where clave='pago_efectivo_br_activo';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 return sid;
exception when others then
 update public.perfiles_proveedor set categoria_principal_id=old_primary,updated_at=now() where usuario_id=pid;
 update public.usuarios set categorias_ids=old_categories,categoria=old_category_name,updated_at=now() where id=pid;
 if br_cash_old is not null then update public.config_sistema set valor=br_cash_old where clave='pago_efectivo_br_activo'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 raise;
end
$$;
revoke all on function public.pilot_qa_run_category_e2e(text) from public,anon,authenticated;
grant execute on function public.pilot_qa_run_category_e2e(text) to service_role;
