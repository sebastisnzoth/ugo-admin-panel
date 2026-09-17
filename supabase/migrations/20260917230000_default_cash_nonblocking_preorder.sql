-- UGO · P0 pago no bloqueante
--
-- Home no exige configurar pago. El pedido lleva su selección en metadata y,
-- cuando no existe ninguna elección previa, UGO usa Efectivo como valor seguro.
-- La preferencia se persiste para la próxima solicitud, pero una falla de UI al
-- guardar esa preferencia nunca debe impedir crear el servicio.

create or replace function private.apply_preorder_payment_preference()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_metodo text;
  v_explicit text;
  v_source text;
begin
  v_explicit := lower(coalesce(
    new.metadata->>'payment_method',
    new.metadata->>'requested_payment_method',
    ''
  ));

  if v_explicit = 'cash' then
    v_explicit := 'efectivo';
  end if;

  if v_explicit in ('pix','efectivo') then
    v_metodo := v_explicit;
    v_source := 'request';

    insert into public.preferencias_pago_cliente(usuario_id,metodo,updated_at)
    values(new.cliente_id,v_metodo,now())
    on conflict(usuario_id)
    do update set metodo=excluded.metodo,updated_at=now();
  else
    select metodo
      into v_metodo
    from public.preferencias_pago_cliente
    where usuario_id = new.cliente_id;

    if v_metodo is null then
      v_metodo := 'efectivo';
      v_source := 'default_cash';

      insert into public.preferencias_pago_cliente(usuario_id,metodo,updated_at)
      values(new.cliente_id,v_metodo,now())
      on conflict(usuario_id) do nothing;
    else
      v_source := 'profile';
    end if;
  end if;

  new.metadata = coalesce(new.metadata,'{}'::jsonb)
    || jsonb_build_object(
      'requested_payment_method', v_metodo,
      'payment_selected_before_order', true,
      'payment_preference_source', v_source,
      'payment_defaulted', v_source = 'default_cash'
    );

  return new;
end;
$$;

drop trigger if exists trg_apply_preorder_payment_preference on public.servicios;
create trigger trg_apply_preorder_payment_preference
before insert on public.servicios
for each row
execute function private.apply_preorder_payment_preference();

revoke all on function private.apply_preorder_payment_preference() from public, anon, authenticated;
grant execute on function private.apply_preorder_payment_preference() to service_role;
