-- UGO P0 · Never start or refresh a matching cycle without a real service location.
-- A legacy request may exist in buscando/ofrecido without ubicacion_cliente. In that
-- case the client must persist a confirmed pickup first; matching must not create
-- a fake five-minute cycle with zero provider offers.

create or replace function public.iniciar_matching(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
set search_path to 'public','private','pg_temp'
as $$
declare
  v_deadline timestamptz := clock_timestamp() + interval '5 minutes';
  v_has_location boolean;
begin
  select (ubicacion_cliente is not null)
    into v_has_location
    from public.servicios
   where id=p_servicio_id
     and (cliente_id=auth.uid() or private.is_admin(auth.uid()));

  if not found then
    raise exception 'No autorizado';
  end if;

  if not coalesce(v_has_location,false) then
    raise exception 'Falta una ubicación válida para buscar profesionales. Confirmá la ubicación del servicio y reintentá.';
  end if;

  update public.servicios
     set matching_expires_at=v_deadline
   where id=p_servicio_id;

  return query select * from private.iniciar_matching_impl(p_servicio_id);
end
$$;

notify pgrst,'reload schema';
