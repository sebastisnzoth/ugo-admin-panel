-- UGO · P0 inmutabilidad del medio de pago.
--
-- Una vez que un pago fue seleccionado, no permitimos que otra ruta (HTTP, RPC,
-- cliente viejo o carrera de UI) reescriba silenciosamente el mismo registro con
-- otro método/procesador. Esto evita que convivan una instrucción de efectivo y
-- un intento electrónico externo para el mismo servicio.
--
-- Única salida normal: un intento en estado `fallido` puede ser reemplazado por
-- otro método. Reembolsos/disputas siguen siendo estados financieros terminales o
-- de resolución y no habilitan un cambio silencioso.

create or replace function private.guard_payment_method_change()
returns trigger
language plpgsql
set search_path to 'public','private','pg_temp'
as $$
begin
  if old.metodo is null then
    return new;
  end if;

  if coalesce(new.metodo,'') = coalesce(old.metodo,'')
     and coalesce(new.procesador,'') = coalesce(old.procesador,'')
     and coalesce(new.modelo_pago,'') = coalesce(old.modelo_pago,'') then
    return new;
  end if;

  if old.estado = 'fallido' then
    return new;
  end if;

  raise exception 'La forma de pago ya fue seleccionada para este servicio';
end;
$$;

drop trigger if exists trg_guard_payment_method_change on public.pagos;
create trigger trg_guard_payment_method_change
before update of metodo,procesador,modelo_pago on public.pagos
for each row
execute function private.guard_payment_method_change();

revoke execute on function private.guard_payment_method_change() from public, anon, authenticated;
grant execute on function private.guard_payment_method_change() to service_role;
