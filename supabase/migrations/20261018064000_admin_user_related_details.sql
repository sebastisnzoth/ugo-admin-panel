-- Narrow, authorized read-only profile relationships for the Admin editor.
create or replace function private.admin_user_related_details(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor public.usuarios%rowtype;
 target public.usuarios%rowtype;
 result jsonb;
begin
 select * into actor from public.usuarios where id=auth.uid();
 if actor.id is null or actor.activo is not true or actor.tipo::text not in ('admin','superadmin') then
  raise insufficient_privilege using message='ADMIN_REQUIRED';
 end if;
 select * into target from public.usuarios where id=p_user_id;
 if not found then raise exception 'USER_NOT_FOUND'; end if;
 if target.tipo::text in ('admin','superadmin','arbitro') and actor.tipo::text <> 'superadmin' then
  raise insufficient_privilege using message='SUPERADMIN_REQUIRED';
 end if;
 select jsonb_build_object(
  'addresses',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'label',d.etiqueta,'address',d.direccion,'complement',d.complemento,'neighborhood',d.barrio,'city',d.ciudad,'default',d.es_predeterminada) order by d.created_at) from public.direcciones_cliente d where d.usuario_id=p_user_id),'[]'::jsonb),
  'zones',coalesce((select jsonb_agg(jsonb_build_object('zone',z.zona,'primary',z.principal) order by z.principal desc,z.zona) from public.proveedor_zonas_activas z where z.proveedor_id=p_user_id),'[]'::jsonb),
  'references',coalesce((select jsonb_agg(jsonb_build_object('name',l.nombre,'relation',l.relacion,'contactAuthorized',l.autorizado_contacto) order by l.created_at) from public.proveedor_referencias_laborales l where l.proveedor_id=p_user_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function private.admin_user_related_details(uuid) from public,anon;
grant execute on function private.admin_user_related_details(uuid) to authenticated;
create or replace function public.admin_user_related_details(p_user_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select private.admin_user_related_details(p_user_id);
$$;
revoke all on function public.admin_user_related_details(uuid) from public,anon;
grant execute on function public.admin_user_related_details(uuid) to authenticated;
