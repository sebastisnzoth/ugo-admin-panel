-- UGO: expose the same cash-payment capability used by selection.
-- UI must fail closed when this capability cannot be read.

create or replace function public.cash_payment_enabled(p_moneda text default 'BRL')
returns boolean
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_global text;
  v_market text;
  v_currency text:=upper(trim(coalesce(p_moneda,'BRL')));
  v_global_enabled boolean;
  v_market_enabled boolean;
begin
  select trim(both '"' from lower(coalesce((select valor from public.config_sistema where clave='pago_efectivo_activo'),'true')))
    into v_global;
  v_global_enabled:=v_global in ('true','1','si','sí','on');
  if not v_global_enabled then return false; end if;

  if v_currency='BRL' then
    select trim(both '"' from lower(coalesce((select valor from public.config_sistema where clave='pago_efectivo_br_activo'),'true')))
      into v_market;
    v_market_enabled:=v_market in ('true','1','si','sí','on');
    return v_market_enabled;
  elsif v_currency='ARS' then
    select trim(both '"' from lower(coalesce((select valor from public.config_sistema where clave='pago_efectivo_ar_activo'),'true')))
      into v_market;
    v_market_enabled:=v_market in ('true','1','si','sí','on');
    return v_market_enabled;
  end if;

  return true;
end;
$$;

revoke all on function public.cash_payment_enabled(text) from public,anon;
grant execute on function public.cash_payment_enabled(text) to authenticated,service_role;
notify pgrst,'reload schema';
