-- Scoped Auth metadata lookup for paginated Admin user editor.
-- Never expose the full auth.users table or allow self-asserted roles.
create or replace function private.admin_get_auth_users_by_ids(p_ids uuid[])
returns table(
 id uuid,email text,email_confirmed boolean,last_sign_in_at timestamptz,created_at timestamptz,
 usuario_nombre text,usuario_tipo text,has_profile boolean
) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.usuarios actor
  where actor.id=auth.uid() and actor.activo is true and actor.tipo::text in ('admin','superadmin')
 ) then raise insufficient_privilege using message='ADMIN_REQUIRED'; end if;
 if coalesce(array_length(p_ids,1),0)>50 then raise exception 'TOO_MANY_USER_IDS'; end if;
 return query
 select au.id, au.email::text,(au.email_confirmed_at is not null), au.last_sign_in_at,au.created_at,
 trim(concat_ws(' ',u.nombre,u.apellido))::text,u.tipo::text,(u.id is not null)
 from auth.users au left join public.usuarios u on u.id=au.id
 where au.id=any(coalesce(p_ids,'{}'::uuid[]));
end $$;
revoke all on function private.admin_get_auth_users_by_ids(uuid[]) from public,anon;
grant execute on function private.admin_get_auth_users_by_ids(uuid[]) to authenticated;
create or replace function public.admin_get_auth_users_by_ids(p_ids uuid[])
returns table(
 id uuid,email text,email_confirmed boolean,last_sign_in_at timestamptz,created_at timestamptz,
 usuario_nombre text,usuario_tipo text,has_profile boolean
) language sql security invoker set search_path='' as $$
 select * from private.admin_get_auth_users_by_ids(p_ids);
$$;
revoke all on function public.admin_get_auth_users_by_ids(uuid[]) from public,anon;
grant execute on function public.admin_get_auth_users_by_ids(uuid[]) to authenticated;
