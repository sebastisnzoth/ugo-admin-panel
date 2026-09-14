-- UGO P0 · restaurar orden de cierre para pagos en efectivo.
--
-- Hallazgo E2E 2026-09-14 en UGO TEST:
-- el proveedor podía mover en_progreso -> esperando_aprobacion con evidencia
-- final, aunque el pago presencial en efectivo siguiera pendiente.
-- Este trigger vuelve a hacer server-authoritative la regla:
-- efectivo recibido -> liberado -> revisión del cliente.

begin;

create or replace function private.guard_cash_before_approval()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_pago public.pagos%rowtype;
begin
  if old.estado = 'en_progreso' and new.estado = 'esperando_aprobacion' then
    select * into v_pago
    from public.pagos
    where servicio_id = new.id
      and ambiente = new.ambiente
    order by created_at desc
    limit 1;

    if found
       and v_pago.metodo = 'efectivo'
       and v_pago.procesador = 'efectivo'
       and v_pago.modelo_pago = 'presencial'
       and v_pago.estado <> 'liberado' then
      raise exception 'Confirmá la recepción del efectivo antes de pedir la aprobación del cliente';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_cash_before_approval() from public;
revoke all on function private.guard_cash_before_approval() from anon;
revoke all on function private.guard_cash_before_approval() from authenticated;

drop trigger if exists trg_guard_cash_before_approval on public.servicios;
create trigger trg_guard_cash_before_approval
before update of estado on public.servicios
for each row
execute function private.guard_cash_before_approval();

commit;
