-- UGO TEST P0: preserve trusted assigned INSERT pricing as well as client INSERT RLS.
-- No policy/grant/percentage changes and no updates to existing rows.
-- Unassigned client requests defer settlement; assigned Admin/QA inserts compute it.

create or replace function private.apply_service_pricing_snapshot()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_quote numeric;
  v_total numeric;
  v_should_lock boolean := false;
begin
  begin
    v_quote := nullif(btrim(coalesce(new.metadata->'tariff_quote'->>'precio_referencia','')),'')::numeric;
  exception when others then
    v_quote := null;
  end;

  if tg_op='INSERT' then
    if new.proveedor_id is null then
      -- Leave supplied settlement values intact for INSERT RLS to reject
      -- client forgery; compute defaults only once this request is assigned.
      if v_quote is not null and v_quote>0 then
        new.tarifa := round(v_quote,2);
        new.metadata := jsonb_set(coalesce(new.metadata,'{}'::jsonb),'{pricing_source}',to_jsonb('ugo_tariff'::text),true);
      end if;
      return new;
    end if;
    -- Trusted Admin/QA assigned INSERT retains the original pricing behavior.
    v_should_lock := v_quote is not null and v_quote>0;
  elsif old.proveedor_id is null and new.proveedor_id is not null then
    v_should_lock := v_quote is not null and v_quote>0;
  end if;

  if v_should_lock then
    v_total := round(v_quote,2);
    new.tarifa := v_total;
    new.comision_ugo := round(v_total*0.15,2);
    new.ganancia_proveedor := round(v_total-new.comision_ugo,2);
    new.metadata := jsonb_set(coalesce(new.metadata,'{}'::jsonb),'{pricing_source}',to_jsonb('ugo_tariff'::text),true);
    if tg_op='UPDATE' and old.proveedor_id is null and new.proveedor_id is not null then
      new.metadata := jsonb_set(new.metadata,'{pricing_locked_at}',to_jsonb(now()::text),true);
    end if;
  elsif new.tarifa is not null and new.tarifa>0
        and (new.comision_ugo is null or new.ganancia_proveedor is null) then
    new.comision_ugo := round(new.tarifa*0.15,2);
    new.ganancia_proveedor := round(new.tarifa-new.comision_ugo,2);
  end if;

  return new;
end;
$$;

revoke all on function private.apply_service_pricing_snapshot() from public,anon,authenticated;

notify pgrst,'reload schema';
