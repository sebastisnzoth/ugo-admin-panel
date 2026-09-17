create or replace function private.apply_preorder_payment_preference()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_metodo text;
begin
  select metodo
    into v_metodo
  from public.preferencias_pago_cliente
  where usuario_id = new.cliente_id;

  if v_metodo is null then
    raise exception 'Elegí una forma de pago antes de crear el pedido';
  end if;

  new.metadata = coalesce(new.metadata,'{}'::jsonb)
    || jsonb_build_object(
      'requested_payment_method', v_metodo,
      'payment_selected_before_order', true
    );
  return new;
end;
$$;

revoke all on function private.apply_preorder_payment_preference() from public, anon, authenticated;
