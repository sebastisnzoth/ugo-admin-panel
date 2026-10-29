-- UGO TEST · Faxina-only supplies, priced by the provider and approved by the client.
-- Additive schema. No modifications to GPS, location functions, or matching rules.
alter table public.perfiles_proveedor
  add column if not exists faxina_productos_lleva boolean not null default false,
  add column if not exists faxina_productos_valor numeric(10,2) not null default 0;
alter table public.perfiles_proveedor
  drop constraint if exists perfiles_proveedor_faxina_productos_valor_check;
alter table public.perfiles_proveedor
  add constraint perfiles_proveedor_faxina_productos_valor_check
  check (faxina_productos_valor >= 0 and faxina_productos_valor <= 1000);

-- Quoting is restricted to the service's authenticated client, after assignment.
create or replace function public.cotizar_productos_faxina(p_servicio_id uuid)
returns numeric language sql stable security definer
set search_path = 'public','private','pg_temp'
as $$
 select case when pp.faxina_productos_lleva then pp.faxina_productos_valor else null end
 from public.servicios s
 join public.categorias c on c.id=s.categoria_id
 join public.perfiles_proveedor pp on pp.usuario_id=s.proveedor_id
 where s.id=p_servicio_id and s.cliente_id=(select auth.uid())
   and coalesce(s.metadata->>'faxina_supplies_requested','false')='true'
   and lower(coalesce(c.slug,c.nombre,'')) ~ '(faxina|limpeza|limpieza)'
   and s.estado in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion')
 limit 1
$$;

-- Client-approved fee is an atomic, idempotent snapshot. Never charge on a checkbox alone.
create or replace function public.aprobar_productos_faxina(p_servicio_id uuid,p_valor_aceptado numeric)
returns numeric language plpgsql security definer
set search_path = 'public','private','pg_temp'
as $$
declare
 v_service public.servicios%rowtype;
 v_fee numeric(10,2);
 v_total numeric(12,2);
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_service from public.servicios where id=p_servicio_id and cliente_id=(select auth.uid()) for update;
 if not found then raise exception 'SERVICE_NOT_OWNED'; end if;
 if coalesce(v_service.metadata->>'faxina_supplies_requested','false') <> 'true'
    or not exists(select 1 from public.categorias c where c.id=v_service.categoria_id and lower(coalesce(c.slug,c.nombre,'')) ~ '(faxina|limpeza|limpieza)')
 then raise exception 'FAXINA_SUPPLIES_NOT_REQUESTED'; end if;
 if coalesce(v_service.metadata->>'faxina_supplies_approved','false')='true' then
   if (v_service.metadata->>'faxina_supplies_fee')::numeric<>p_valor_aceptado then raise exception 'FEE_ALREADY_APPROVED'; end if;
   return v_service.tarifa;
 end if;
 if v_service.estado <> 'asignado' or v_service.proveedor_id is null then raise exception 'APPROVAL_NOT_ALLOWED_IN_STATE'; end if;
 select case when faxina_productos_lleva then faxina_productos_valor else null end
   into v_fee from public.perfiles_proveedor where usuario_id=v_service.proveedor_id;
 if v_fee is null or v_fee<=0 or v_fee>1000 or p_valor_aceptado is distinct from v_fee
 then raise exception 'FEE_CHANGED_OR_UNAVAILABLE'; end if;
 if coalesce(v_service.tarifa,0)<=0 then raise exception 'BASE_PRICE_NOT_CONFIRMED'; end if;
 if exists(select 1 from public.pagos where servicio_id=p_servicio_id) then raise exception 'PAYMENT_ALREADY_STARTED'; end if;
 v_total := round(v_service.tarifa+v_fee,2);
 update public.servicios
    set tarifa=v_total,
        comision_ugo=round(v_total*0.15,2),
        ganancia_proveedor=round(v_total*0.85,2),
        metadata=coalesce(v_service.metadata,'{}'::jsonb)||
          jsonb_build_object('faxina_supplies_approved',true,'faxina_supplies_fee',v_fee,'faxina_supplies_approved_at',now())
  where id=p_servicio_id;
 return v_total;
end
$$;
revoke all on function public.cotizar_productos_faxina(uuid) from public,anon;
grant execute on function public.cotizar_productos_faxina(uuid) to authenticated;
revoke all on function public.aprobar_productos_faxina(uuid,numeric) from public,anon;
grant execute on function public.aprobar_productos_faxina(uuid,numeric) to authenticated;
notify pgrst,'reload schema';
