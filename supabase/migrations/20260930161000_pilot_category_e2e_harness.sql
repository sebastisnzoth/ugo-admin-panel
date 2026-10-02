-- UGO Pilot · service-role-only end-to-end harness for Faxina and Marido de Aluguel.
-- Runs exclusively against isolated UGO TEST and reuses production business RPC paths.
create or replace function public.pilot_qa_run_category_e2e(p_slug text)
returns uuid
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
 cid constant uuid:='4e3d7be7-f7d4-4cba-9afe-2e69d75617b7';
 pid constant uuid:='163f8444-0098-4022-bb71-8418b24b16fb';
 cat uuid; cat_name text; sid uuid; oid uuid; s public.servicios%rowtype; loc extensions.geography;
 lat double precision; lng double precision; arrival jsonb; initial_role text; br_cash_old text; expansion public.ampliaciones_servicio%rowtype;
 old_primary uuid; old_categories uuid[]; old_category_name text; old_verification public.perfiles_proveedor.estado_verificacion%type; old_online boolean; old_disponible boolean; old_loc extensions.geography; old_loc_updated timestamptz; old_accuracy numeric; old_onboarding timestamptz; old_terms timestamptz; old_rate numeric; pilot_details jsonb;
begin
 initial_role:=coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','');
 if initial_role<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
 if p_slug not in ('faxina','marido-de-aluguel') then raise exception 'PILOT_CATEGORY_REQUIRED'; end if;
 select id,nombre into cat,cat_name from public.categorias where slug=p_slug and activa=true;
 if cat is null then raise exception 'PILOT_CATEGORY_NOT_ACTIVE:%',p_slug; end if;

 select valor into br_cash_old from public.config_sistema where clave='pago_efectivo_br_activo' for update;
 if br_cash_old is null then raise exception 'TEST_CASH_CONFIG_MISSING'; end if;
 select p.categoria_principal_id,u.categorias_ids,u.categoria,p.estado_verificacion,p.online,p.disponible,p.ubicacion,p.ubicacion_updated_at,p.ubicacion_accuracy_m,p.onboarding_completo_at,p.termos_aceitos_at,p.tarifa_base
 into old_primary,old_categories,old_category_name,old_verification,old_online,old_disponible,old_loc,old_loc_updated,old_accuracy,old_onboarding,old_terms,old_rate
 from public.perfiles_proveedor p join public.usuarios u on u.id=p.usuario_id where p.usuario_id=pid;
 if not found then raise exception 'PILOT_ISOLATED_PROVIDER_PROFILE_REQUIRED'; end if;
 loc:=extensions.st_setsrid(extensions.st_makepoint(-48.477,-27.438),4326)::extensions.geography;
 lat:=-27.438;lng:=-48.477;

 update public.config_sistema set valor='true' where clave='pago_efectivo_br_activo';
 update public.perfiles_proveedor
 set categoria_principal_id=cat,estado_verificacion='verificado',onboarding_completo_at=coalesce(onboarding_completo_at,now()),termos_aceitos_at=coalesce(termos_aceitos_at,now()),tarifa_base=coalesce(nullif(tarifa_base,0),120),online=true,disponible=true,
     ubicacion=loc,ubicacion_updated_at=now(),ubicacion_accuracy_m=10,updated_at=now()
 where usuario_id=pid;
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

 -- Real governed scope change: provider proposes, client explicitly approves,
 -- and cash totals are adjusted before completion.
 select * into expansion
 from public.proponer_ampliacion_servicio(
   sid,
   case when p_slug='faxina' then 'Limpeza interna adicional de armário solicitada no local' else 'Fixação adicional aprovada durante a execução' end,
   20,
   15
 );
 if expansion.id is null or expansion.estado<>'pendiente' then raise exception 'PILOT_SCOPE_PROPOSAL_FAILED:%',p_slug; end if;

 perform set_config('request.jwt.claim.sub',cid::text,true);
 select * into expansion from public.resolver_ampliacion_servicio(expansion.id,true);
 if expansion.estado<>'aprobada' or expansion.pago_estado<>'incluido' then
   raise exception 'PILOT_SCOPE_APPROVAL_FAILED:%:%:%',p_slug,expansion.estado,expansion.pago_estado;
 end if;

 update public.servicios
 set metadata=metadata||jsonb_build_object(
   'scope_change',
   jsonb_build_object('status','approved','expansion_id',expansion.id,'amount_extra',expansion.monto_extra,'minutes_extra',expansion.minutos_extra,'approved',true)
 )
 where id=sid;

 perform set_config('request.jwt.claim.sub',pid::text,true);
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

 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 update public.perfiles_proveedor
 set categoria_principal_id=old_primary,estado_verificacion=old_verification,onboarding_completo_at=old_onboarding,termos_aceitos_at=old_terms,tarifa_base=old_rate,online=old_online,disponible=old_disponible,
     ubicacion=old_loc,ubicacion_updated_at=old_loc_updated,ubicacion_accuracy_m=old_accuracy,updated_at=now()
 where usuario_id=pid;
 update public.usuarios set categorias_ids=old_categories,categoria=old_category_name,updated_at=now() where id=pid;
 update public.config_sistema set valor=br_cash_old where clave='pago_efectivo_br_activo';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 return sid;
exception when others then
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 update public.perfiles_proveedor
 set categoria_principal_id=old_primary,estado_verificacion=old_verification,onboarding_completo_at=old_onboarding,termos_aceitos_at=old_terms,tarifa_base=old_rate,online=old_online,disponible=old_disponible,
     ubicacion=old_loc,ubicacion_updated_at=old_loc_updated,ubicacion_accuracy_m=old_accuracy,updated_at=now()
 where usuario_id=pid;
 update public.usuarios set categorias_ids=old_categories,categoria=old_category_name,updated_at=now() where id=pid;
 if br_cash_old is not null then update public.config_sistema set valor=br_cash_old where clave='pago_efectivo_br_activo'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claim.role',initial_role,true);
 raise;
end
$$;
revoke all on function public.pilot_qa_run_category_e2e(text) from public,anon,authenticated;
grant execute on function public.pilot_qa_run_category_e2e(text) to service_role;
