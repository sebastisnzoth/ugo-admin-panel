-- UGO client-payment: auditable, idempotent cash release.
create or replace function private.audit_cash_payment_release()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if old.estado is distinct from 'liberado'
     and new.estado='liberado'
     and new.metodo='efectivo'
     and new.procesador='efectivo'
     and new.modelo_pago='presencial' then
    insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
    values(
      'client.cash_payment.confirmed',
      auth.uid(),
      'servicio',
      new.servicio_id,
      jsonb_build_object(
        'pago_id',new.id,
        'servicio_id',new.servicio_id,
        'cliente_id',new.cliente_id,
        'proveedor_id',new.proveedor_id,
        'monto',new.monto_bruto,
        'comision_ugo',new.comision_ugo,
        'moneda',new.moneda,
        'ambiente',new.ambiente,
        'estado',new.estado
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_cash_payment_release() from public,anon,authenticated;

drop trigger if exists trg_audit_cash_payment_release on public.pagos;
create trigger trg_audit_cash_payment_release
after update of estado on public.pagos
for each row execute function private.audit_cash_payment_release();

notify pgrst,'reload schema';
