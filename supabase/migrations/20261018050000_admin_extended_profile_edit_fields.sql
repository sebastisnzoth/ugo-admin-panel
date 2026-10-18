-- One authorized transaction for base/profile data and its audit record.
-- The private definer is necessary only for the protected audit append; the
-- public entry point is invoker-only. Neither entry accepts roles or activity.
create or replace function private.admin_update_user_profile(p_usuario_id uuid,p_user jsonb,p_profile jsonb)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
 actor public.usuarios%rowtype;
 target public.usuarios%rowtype;
 changed public.usuarios%rowtype;
 client_patch public.perfiles_cliente%rowtype;
 provider_patch public.perfiles_proveedor%rowtype;
 allowed_profile text[];
 categories uuid[];
 affected integer;
begin
 select * into actor from public.usuarios where id=auth.uid() for share;
 if not found or actor.activo is not true or actor.tipo::text not in ('admin','superadmin') then
  raise insufficient_privilege using message='ADMIN_REQUIRED';
 end if;
 select * into target from public.usuarios where id=p_usuario_id for update;
 if not found then raise exception 'USER_NOT_FOUND'; end if;
 if target.tipo::text in ('admin','superadmin','arbitro') and actor.tipo::text<>'superadmin' then
  raise insufficient_privilege using message='SUPERADMIN_REQUIRED_FOR_PRIVILEGED_ACCOUNT';
 end if;
 if p_user is null or p_profile is null or jsonb_typeof(p_user)<>'object' or jsonb_typeof(p_profile)<>'object' then raise exception 'INVALID_PROFILE_OBJECT'; end if;
 if exists(select 1 from jsonb_object_keys(p_user) k where k<>all(array['nombre','apellido','pais','zona','telefono','foto_url','categorias_ids'])) then raise exception 'PROFILE_FIELD_NOT_ALLOWED'; end if;
 if exists(select 1 from jsonb_each(p_user) e where e.key<>'categorias_ids' and jsonb_typeof(e.value) not in ('string','null')) then raise exception 'INVALID_PROFILE_TEXT'; end if;
 if not(p_user?'nombre') or nullif(btrim(p_user->>'nombre'),'') is null then raise exception 'NAME_REQUIRED'; end if;
 if coalesce(p_user->>'foto_url','')<>'' and (p_user->>'foto_url') !~* '^https?://' then raise exception 'INVALID_PHOTO_URL'; end if;
 allowed_profile:=case target.tipo::text when 'cliente' then array['telefono','direccion','barrio','ciudad','idioma_preferido','contacto_preferido','horarios_preferidos','instrucciones_acceso','preferencias_servicio','observaciones'] when 'proveedor' then array['telefono_profesional','ciudad_base','bio','experiencia_anos','categoria_principal_id','especialidades','idiomas','disponibilidad_horaria','tarifa_base','zona_radio_km'] else array[]::text[] end;
 if exists(select 1 from jsonb_object_keys(p_profile) k where k<>all(allowed_profile)) then raise exception 'PROFILE_FIELD_NOT_ALLOWED'; end if;
 if exists(select 1 from jsonb_each(p_profile) e where e.key not in ('experiencia_anos','tarifa_base','zona_radio_km') and jsonb_typeof(e.value) not in ('string','null')) then raise exception 'INVALID_PROFILE_TEXT'; end if;
 if p_profile?'experiencia_anos' and p_profile->'experiencia_anos'<>'null'::jsonb and (p_profile->>'experiencia_anos') !~ '^[0-9]+$' then raise exception 'INVALID_EXPERIENCE'; end if;
 if exists(select 1 from jsonb_each(p_profile) e where e.key in ('tarifa_base','zona_radio_km') and jsonb_typeof(e.value) not in ('number','null')) then raise exception 'INVALID_NUMERIC_PROFILE_FIELD'; end if;
 changed:=jsonb_populate_record(target,p_user-'categorias_ids');
 if p_user?'categorias_ids' then
  if target.tipo::text<>'proveedor' or jsonb_typeof(p_user->'categorias_ids')<>'array' then raise exception 'INVALID_CATEGORIES'; end if;
  select coalesce(array_agg(value::uuid),'{}'::uuid[]) into categories from jsonb_array_elements_text(p_user->'categorias_ids');
  if exists(select 1 from unnest(categories) c where c is null or not exists(select 1 from public.categorias where id=c)) then raise exception 'CATEGORY_NOT_FOUND'; end if;
 else categories:=target.categorias_ids; end if;
 if target.tipo::text='cliente' then
  if p_profile ? 'idioma_preferido' and nullif(btrim(p_profile->>'idioma_preferido'),'') is null then raise exception 'INVALID_PREFERRED_LANGUAGE'; end if;
  if p_profile ? 'contacto_preferido' and nullif(btrim(p_profile->>'contacto_preferido'),'') is null then raise exception 'INVALID_PREFERRED_CONTACT'; end if;
  select * into client_patch from public.perfiles_cliente where usuario_id=p_usuario_id for update;
  if not found then raise exception 'CLIENT_PROFILE_NOT_FOUND'; end if;
  client_patch:=jsonb_populate_record(client_patch,p_profile);
 elsif target.tipo::text='proveedor' then
  select * into provider_patch from public.perfiles_proveedor where usuario_id=p_usuario_id for update;
  if not found then raise exception 'PROVIDER_PROFILE_NOT_FOUND'; end if;
  provider_patch:=jsonb_populate_record(provider_patch,p_profile);
  if provider_patch.experiencia_anos is not null and (provider_patch.experiencia_anos<0 or provider_patch.experiencia_anos>100) then raise exception 'INVALID_EXPERIENCE'; end if;
  if provider_patch.tarifa_base is null or provider_patch.tarifa_base<0 then raise exception 'INVALID_BASE_RATE'; end if;
  if provider_patch.zona_radio_km is null or provider_patch.zona_radio_km<=0 or provider_patch.zona_radio_km>1000 then raise exception 'INVALID_RADIUS'; end if;
  if provider_patch.categoria_principal_id is not null and not coalesce(provider_patch.categoria_principal_id=any(categories),false) then raise exception 'PRIMARY_CATEGORY_NOT_IN_MEMBERSHIP'; end if;
 end if;
 update public.usuarios set nombre=btrim(changed.nombre),apellido=changed.apellido,pais=changed.pais,zona=changed.zona,telefono=changed.telefono,foto_url=changed.foto_url,categorias_ids=categories where id=p_usuario_id;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'USER_NOT_UPDATED'; end if;
 if target.tipo::text='cliente' then
  update public.perfiles_cliente set telefono=client_patch.telefono,direccion=client_patch.direccion,barrio=client_patch.barrio,ciudad=client_patch.ciudad,idioma_preferido=client_patch.idioma_preferido,contacto_preferido=client_patch.contacto_preferido,horarios_preferidos=client_patch.horarios_preferidos,instrucciones_acceso=client_patch.instrucciones_acceso,preferencias_servicio=client_patch.preferencias_servicio,observaciones=client_patch.observaciones where usuario_id=p_usuario_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'CLIENT_PROFILE_NOT_UPDATED'; end if;
 elsif target.tipo::text='proveedor' then
  update public.perfiles_proveedor set telefono_profesional=provider_patch.telefono_profesional,ciudad_base=provider_patch.ciudad_base,bio=provider_patch.bio,experiencia_anos=provider_patch.experiencia_anos,categoria_principal_id=provider_patch.categoria_principal_id,especialidades=provider_patch.especialidades,idiomas=provider_patch.idiomas,disponibilidad_horaria=provider_patch.disponibilidad_horaria,tarifa_base=provider_patch.tarifa_base,zona_radio_km=provider_patch.zona_radio_km where usuario_id=p_usuario_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'PROVIDER_PROFILE_NOT_UPDATED'; end if;
 end if;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('admin_usuario_perfil_actualizado',actor.id,'usuario',p_usuario_id,jsonb_build_object('user_fields',array(select jsonb_object_keys(p_user)),'profile_fields',array(select jsonb_object_keys(p_profile))));
 return jsonb_build_object('id',p_usuario_id);
end $function$;
revoke all on function private.admin_update_user_profile(uuid,jsonb,jsonb) from public,anon;
grant execute on function private.admin_update_user_profile(uuid,jsonb,jsonb) to authenticated;
create or replace function public.admin_update_user_profile(p_usuario_id uuid,p_user jsonb,p_profile jsonb)
returns jsonb language sql security invoker set search_path='' as $function$
 select private.admin_update_user_profile(p_usuario_id,p_user,p_profile);
$function$;
revoke all on function public.admin_update_user_profile(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.admin_update_user_profile(uuid,jsonb,jsonb) to authenticated;
