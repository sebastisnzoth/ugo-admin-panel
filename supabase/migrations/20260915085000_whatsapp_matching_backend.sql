-- Secure WhatsApp-only bridge into the canonical matching engine.
-- Reuses private.iniciar_matching_impl instead of duplicating matching logic.

create or replace function public.iniciar_matching_backend(p_servicio_id uuid)
returns table(
  oferta_id uuid,
  proveedor_id uuid,
  proveedor_nombre text,
  karma numeric,
  distancia_km numeric,
  tarifa_ofrecida numeric,
  ranking integer
)
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $$
declare
  v_cliente_id uuid;
  v_source text;
  v_previous_sub text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role requerida';
  end if;

  select s.cliente_id, coalesce(s.metadata->>'source','')
    into v_cliente_id, v_source
    from public.servicios s
   where s.id = p_servicio_id
   for update;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if v_cliente_id is null or v_source <> 'whatsapp' then
    raise exception 'Matching backend permitido solo para servicios WhatsApp';
  end if;

  v_previous_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claim.sub', v_cliente_id::text, true);

  return query
  select * from private.iniciar_matching_impl(p_servicio_id);

  perform set_config('request.jwt.claim.sub', coalesce(v_previous_sub, ''), true);
exception
  when others then
    perform set_config('request.jwt.claim.sub', coalesce(v_previous_sub, ''), true);
    raise;
end;
$$;

revoke all on function public.iniciar_matching_backend(uuid) from public;
revoke all on function public.iniciar_matching_backend(uuid) from anon;
revoke all on function public.iniciar_matching_backend(uuid) from authenticated;
grant execute on function public.iniciar_matching_backend(uuid) to service_role;

comment on function public.iniciar_matching_backend(uuid) is
  'Service-role-only WhatsApp bridge. Temporarily delegates auth.uid() to the owning client and reuses private.iniciar_matching_impl.';
