-- UGO onsite quote: materialize cash after the approved amount becomes known.
-- The provider may already be en_camino or llegado when the client approves the quote.

create or replace function private.materialize_cash_payment_on_assignment()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_method text;
  v_total numeric(12,2);
  v_commission numeric(12,2);
  v_net numeric(12,2);
begin
  if new.proveedor_id is null
     or new.estado not in ('asignado','en_camino','llegado') then
    return new;
  end if;

  v_method:=lower(coalesce(
    new.metadata->>'requested_payment_method',
    new.metadata->>'payment_method',
    ''
  ));
  if v_method='cash' then v_method:='efectivo'; end if;
  if v_method<>'efectivo' then return new; end if;

  if exists(select 1 from public.pagos p where p.servicio_id=new.id) then
    return new;
  end if;

  v_total:=round(coalesce(new.tarifa,0)::numeric,2);
  if v_total<=0 then return new; end if;

  v_commission:=round(coalesce(new.comision_ugo,v_total*0.15)::numeric,2);
  v_net:=round(coalesce(new.ganancia_proveedor,v_total-v_commission)::numeric,2);

  insert into public.pagos(
    servicio_id,cliente_id,proveedor_id,
    procesador,metodo,modelo_pago,ambiente,
    monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado
  ) values(
    new.id,new.cliente_id,new.proveedor_id,
    'efectivo','efectivo','presencial',new.ambiente,
    v_total,v_commission,v_net,coalesce(new.moneda,'BRL'),'pendiente'
  )
  on conflict(servicio_id) do nothing;

  return new;
end;
$$;

revoke all on function private.materialize_cash_payment_on_assignment() from public,anon,authenticated;

drop trigger if exists trg_materialize_cash_payment_on_assignment on public.servicios;
create trigger trg_materialize_cash_payment_on_assignment
after update of proveedor_id,estado,tarifa,comision_ugo,ganancia_proveedor,metadata
on public.servicios
for each row
when (
  new.proveedor_id is not null
  and new.estado in ('asignado','en_camino','llegado')
)
execute function private.materialize_cash_payment_on_assignment();

notify pgrst,'reload schema';
