-- P0 privacy/integrity guard: a signed-in user must not be able to take over
-- or rotate the keys of another user's existing Web Push endpoint through the
-- SECURITY DEFINER RPC, including a concurrent first-registration race.

create or replace function public.guardar_push_suscripcion(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'Sesión requerida';
  end if;

  if coalesce(length(p_endpoint),0) < 20
     or coalesce(length(p_p256dh),0) < 20
     or coalesce(length(p_auth),0) < 8 then
    raise exception 'Suscripción push inválida';
  end if;

  select usuario_id
    into v_owner
    from public.push_suscripciones
   where endpoint = p_endpoint
   for update;

  if v_owner is not null and v_owner <> v_uid then
    raise exception 'El endpoint push ya pertenece a otra cuenta';
  end if;

  insert into public.push_suscripciones(
    usuario_id,endpoint,p256dh,auth,user_agent,activa,updated_at
  ) values(
    v_uid,p_endpoint,p_p256dh,p_auth,left(p_user_agent,500),true,now()
  )
  on conflict(endpoint) do update set
    p256dh=excluded.p256dh,
    auth=excluded.auth,
    user_agent=excluded.user_agent,
    activa=true,
    updated_at=now()
  where public.push_suscripciones.usuario_id = v_uid
  returning id into v_id;

  -- The WHERE on ON CONFLICT is the final guard for the race where two
  -- different users register the same previously unseen endpoint concurrently.
  if v_id is null then
    raise exception 'El endpoint push ya pertenece a otra cuenta';
  end if;

  return v_id;
end;
$$;

revoke all on function public.guardar_push_suscripcion(text,text,text,text) from public;
grant execute on function public.guardar_push_suscripcion(text,text,text,text) to authenticated;
