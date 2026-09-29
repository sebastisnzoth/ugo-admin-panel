-- UGO readiness provider-accept · harden and make provider offer rejection idempotent.
-- Rejection now serializes competing responses, verifies ownership with auth.uid(),
-- and treats a retry of an already-rejected offer as success.

create or replace function private.rechazar_oferta_impl(p_oferta_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_oferta public.ofertas_servicio%rowtype;
begin
  if v_uid is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_oferta
  from public.ofertas_servicio
  where id = p_oferta_id
  for update;

  if not found or v_oferta.proveedor_id <> v_uid then
    raise exception 'Oferta inexistente o no autorizada';
  end if;

  if v_oferta.estado = 'rechazada' then
    return;
  end if;

  if v_oferta.estado <> 'pendiente' then
    raise exception 'La oferta ya no está disponible';
  end if;

  update public.ofertas_servicio
     set estado='rechazada',
         respondida_at=coalesce(respondida_at,now())
   where id=p_oferta_id
     and proveedor_id=v_uid
     and estado='pendiente';

  if not found then
    select * into v_oferta
    from public.ofertas_servicio
    where id=p_oferta_id
      and proveedor_id=v_uid;

    if found and v_oferta.estado='rechazada' then
      return;
    end if;

    raise exception 'La oferta ya no está disponible';
  end if;
end
$function$;

revoke all on function public.rechazar_oferta(uuid) from public;
revoke all on function public.rechazar_oferta(uuid) from anon;
grant execute on function public.rechazar_oferta(uuid) to authenticated;

revoke all on function private.rechazar_oferta_impl(uuid) from public;
revoke all on function private.rechazar_oferta_impl(uuid) from anon;
grant execute on function private.rechazar_oferta_impl(uuid) to authenticated;
grant execute on function private.rechazar_oferta_impl(uuid) to service_role;

notify pgrst,'reload schema';
