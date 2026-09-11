-- UGO · efectivo administrable y aplicado al flujo real
-- Mantiene config_sistema como fuente de verdad y evita exponer secretos.

insert into public.config_sistema (clave, valor, descripcion, grupo)
values
  ('pago_efectivo_activo', 'true', 'Habilita el pago presencial en efectivo dentro de UGO.', 'pagos'),
  ('pago_efectivo_br_activo', 'true', 'Habilita efectivo para servicios en BRL / Brasil.', 'pagos'),
  ('pago_efectivo_ar_activo', 'true', 'Habilita efectivo para servicios en ARS / Argentina.', 'pagos')
on conflict (clave) do nothing;

create or replace function public.cash_payment_enabled(p_moneda text default null)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    coalesce((select lower(valor) in ('true','1','si','sí') from public.config_sistema where clave='pago_efectivo_activo'), true)
    and case upper(coalesce(nullif(p_moneda,''), 'BRL'))
      when 'BRL' then coalesce((select lower(valor) in ('true','1','si','sí') from public.config_sistema where clave='pago_efectivo_br_activo'), true)
      when 'ARS' then coalesce((select lower(valor) in ('true','1','si','sí') from public.config_sistema where clave='pago_efectivo_ar_activo'), true)
      else true
    end;
$$;

revoke all on function public.cash_payment_enabled(text) from public;
grant execute on function public.cash_payment_enabled(text) to authenticated, service_role;

create or replace function public.seleccionar_pago_efectivo(p_servicio_id uuid)
returns public.pagos
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  v_moneda text;
  v_pago public.pagos%rowtype;
begin
  select moneda into v_moneda
  from public.servicios
  where id = p_servicio_id;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if not public.cash_payment_enabled(v_moneda) then
    raise exception 'El pago en efectivo no está habilitado para este servicio';
  end if;

  select private.seleccionar_pago_efectivo_impl(p_servicio_id) into v_pago;
  return v_pago;
end;
$$;

grant execute on function public.seleccionar_pago_efectivo(uuid) to authenticated, service_role;
