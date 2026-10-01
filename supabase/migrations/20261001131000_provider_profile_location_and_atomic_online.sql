-- Provider profile location + atomic Online activation for matching/alerts.
create or replace function public.guardar_ubicacion_base_proveedor(p_lat double precision,p_lng double precision,p_captured_at timestamptz,p_accuracy_m double precision)
returns jsonb language plpgsql security definer set search_path to 'public','private','extensions','pg_temp' as $$
declare v_uid uuid:=auth.uid(); v_age_ms double precision;
begin
 if v_uid is null then raise exception 'Sesión requerida'; end if;
 if not exists(select 1 from public.usuarios u join public.perfiles_proveedor pp on pp.usuario_id=u.id where u.id=v_uid and u.tipo='proveedor' and u.activo=true and pp.estado_verificacion='verificado') then raise exception 'Proveedor verificado requerido'; end if;
 if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 or (abs(p_lat)<0.0001 and abs(p_lng)<0.0001) then raise exception 'Coordenadas GPS inválidas'; end if;
 if p_captured_at is null then raise exception 'Timestamp de captura GPS requerido'; end if;
 v_age_ms:=extract(epoch from(now()-p_captured_at))*1000.0;
 if v_age_ms < -5000 or v_age_ms > 30000 then raise exception 'Ubicación GPS antigua o con reloj inválido'; end if;
 if p_accuracy_m is null or p_accuracy_m<=0 or p_accuracy_m>250 then raise exception 'Precisión GPS insuficiente'; end if;
 perform set_config('ugo.trusted_provider_location',v_uid::text,true);
 update public.perfiles_proveedor set ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,ubicacion_updated_at=p_captured_at,ubicacion_accuracy_m=p_accuracy_m,updated_at=now() where usuario_id=v_uid;
 perform set_config('ugo.trusted_provider_location','',true);
 update public.usuarios set lat=p_lat,lng=p_lng,updated_at=now() where id=v_uid;
 return jsonb_build_object('status','saved','captured_at',p_captured_at,'accuracy_m',p_accuracy_m);
end $$;

create or replace function public.activar_disponibilidad_proveedor(p_lat double precision,p_lng double precision,p_captured_at timestamptz,p_accuracy_m double precision)
returns jsonb language plpgsql security definer set search_path to 'public','private','extensions','pg_temp' as $$
declare v_uid uuid:=auth.uid(); v_age_ms double precision;
begin
 if v_uid is null then raise exception 'Sesión requerida'; end if;
 if not exists(select 1 from public.usuarios u join public.perfiles_proveedor pp on pp.usuario_id=u.id where u.id=v_uid and u.tipo='proveedor' and u.activo=true and pp.estado_verificacion='verificado' and pp.onboarding_completo_at is not null and pp.termos_aceitos_at is not null) then raise exception 'Perfil de proveedor incompleto o no verificado'; end if;
 if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 or (abs(p_lat)<0.0001 and abs(p_lng)<0.0001) then raise exception 'Coordenadas GPS inválidas'; end if;
 if p_captured_at is null then raise exception 'Timestamp de captura GPS requerido'; end if;
 v_age_ms:=extract(epoch from(now()-p_captured_at))*1000.0;
 if v_age_ms < -5000 or v_age_ms > 30000 then raise exception 'Ubicación GPS antigua o con reloj inválido'; end if;
 if p_accuracy_m is null or p_accuracy_m<=0 or p_accuracy_m>250 then raise exception 'Precisión GPS insuficiente'; end if;
 perform set_config('ugo.trusted_provider_location',v_uid::text,true);
 update public.perfiles_proveedor set ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,ubicacion_updated_at=p_captured_at,ubicacion_accuracy_m=p_accuracy_m,online=true,disponible=true,updated_at=now() where usuario_id=v_uid;
 perform set_config('ugo.trusted_provider_location','',true);
 update public.usuarios set lat=p_lat,lng=p_lng,updated_at=now() where id=v_uid;
 return jsonb_build_object('status','online','captured_at',p_captured_at,'accuracy_m',p_accuracy_m);
end $$;

revoke all on function public.guardar_ubicacion_base_proveedor(double precision,double precision,timestamptz,double precision) from public, anon;
grant execute on function public.guardar_ubicacion_base_proveedor(double precision,double precision,timestamptz,double precision) to authenticated;
revoke all on function public.activar_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) from public, anon;
grant execute on function public.activar_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) to authenticated;
