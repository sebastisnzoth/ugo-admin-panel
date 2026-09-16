create or replace function public.guardar_categorias_proveedor(p_categoria_principal_id uuid, p_categorias uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_primary_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.usuarios where id=v_uid and tipo='proveedor' and activo=true) then raise exception 'PROVIDER_REQUIRED'; end if;
  if p_categoria_principal_id is null then raise exception 'PRIMARY_CATEGORY_REQUIRED'; end if;

  select array_agg(distinct c.id order by c.id), max(c.nombre) filter(where c.id=p_categoria_principal_id)
    into v_ids, v_primary_name
  from public.categorias c
  where c.activa=true and c.id=any(coalesce(p_categorias,'{}'::uuid[]) || array[p_categoria_principal_id]);

  if v_primary_name is null then raise exception 'INVALID_PRIMARY_CATEGORY'; end if;
  if v_ids is null or cardinality(v_ids)=0 then raise exception 'CATEGORY_REQUIRED'; end if;

  update public.perfiles_proveedor
     set categoria_principal_id=p_categoria_principal_id, updated_at=now()
   where usuario_id=v_uid;
  if not found then raise exception 'PROVIDER_PROFILE_REQUIRED'; end if;

  update public.usuarios
     set categorias_ids=v_ids, categoria=v_primary_name, updated_at=now()
   where id=v_uid;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('provider_categories_updated',v_uid,'usuario',v_uid,jsonb_build_object('principal',p_categoria_principal_id,'categorias',to_jsonb(v_ids)));
  return v_ids;
end;
$$;

revoke all on function public.guardar_categorias_proveedor(uuid,uuid[]) from public, anon;
grant execute on function public.guardar_categorias_proveedor(uuid,uuid[]) to authenticated;
