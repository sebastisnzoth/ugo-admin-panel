-- UGO · payment-before-dispatch hard gate.
create or replace function private.service_dispatch_payment_method(p_servicio_id uuid)
returns text
language sql
stable
security definer
set search_path='public','private','pg_temp'
as $$
  select case
    when lower(coalesce(metadata->>'requested_payment_method',metadata->>'payment_method',''))='cash' then 'efectivo'
    else lower(coalesce(metadata->>'requested_payment_method',metadata->>'payment_method',''))
  end
  from public.servicios
  where id=p_servicio_id;
$$;

revoke all on function private.service_dispatch_payment_method(uuid) from public,anon,authenticated;

create or replace function private.enforce_offer_payment_before_dispatch()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare v_method text;
begin
  if new.estado='pendiente' then
    v_method:=private.service_dispatch_payment_method(new.servicio_id);
    if coalesce(v_method,'') not in ('efectivo','pix') then
      raise exception 'Forma de pago requerida antes de distribuir el pedido';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_offer_payment_before_dispatch() from public,anon,authenticated;

drop trigger if exists trg_offer_payment_before_dispatch on public.ofertas_servicio;
create trigger trg_offer_payment_before_dispatch
before insert or update of estado on public.ofertas_servicio
for each row execute function private.enforce_offer_payment_before_dispatch();

create or replace function public.iniciar_matching(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_deadline timestamptz := clock_timestamp() + interval '5 minutes';
  v_method text;
begin
  select private.service_dispatch_payment_method(p_servicio_id) into v_method;
  if coalesce(v_method,'') not in ('efectivo','pix') then
    raise exception 'Elegí una forma de pago antes de buscar profesionales';
  end if;
  update public.servicios
     set matching_expires_at=v_deadline
   where id=p_servicio_id
     and (cliente_id=auth.uid() or private.is_admin(auth.uid()));
  if not found then raise exception 'No autorizado'; end if;
  return query select * from private.iniciar_matching_impl(p_servicio_id);
end
$$;

revoke all on function public.iniciar_matching(uuid) from public,anon;
grant execute on function public.iniciar_matching(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
