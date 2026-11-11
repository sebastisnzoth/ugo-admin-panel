-- REVIEW ONLY / TEST ONLY: do not apply to UGO, UGO Arena PROD or payments Neon.
-- Intended solely for an independently isolated Supabase TEST backend with
-- the guarded allowlist in docs/sql/ugo_pix_after_service_test_allowlist.sql.
-- No pilot flag, allowed service or wallet is enabled by this file.
-- Separate from financial settlement. QR creation is a later provider action.
--
-- Preflight: verify the exact deployed version of private.aprobar_servicio_impl
-- and config_sistema.valor before applying to the isolated TEST project.
-- Rollback: DROP FUNCTION public.aprobar_trabajo_pix_diferido_test(uuid);
--
-- SECURITY DEFINER is necessary to inspect the private service allowlist.
-- The explicit auth.uid, owner, demo, environment, configuration, price and
-- evidence checks below are security boundaries, not optional UI checks.
create or replace function public.aprobar_trabajo_pix_diferido_test(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_method text;
  v_test_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found or v_servicio.cliente_id is distinct from auth.uid() then
    raise exception 'Servicio inexistente o no autorizado';
  end if;
  if v_servicio.estado <> 'esperando_aprobacion' then
    raise exception 'El trabajo todavía no está listo para aprobación';
  end if;

  select coalesce(
    lower(btrim(trim(both '"' from valor::text))) in ('true','1','on'), false)
  into v_test_enabled
  from public.config_sistema
  where clave='ugo_pix_after_service_test_enabled'
  limit 1;

  v_method := lower(coalesce(
    v_servicio.metadata->>'requested_payment_method',
    v_servicio.metadata->>'payment_method',''));

  if not coalesce(v_test_enabled,false)
     or v_servicio.ambiente <> 'demo'
     or coalesce(v_servicio.moneda,'BRL') <> 'BRL'
     or v_servicio.proveedor_id is null
     or not private.is_demo_service(p_servicio_id)
     or not private.is_demo_account(auth.uid(),'cliente')
     or not private.is_demo_account(v_servicio.proveedor_id,'proveedor')
     or v_method <> 'pix'
     or v_servicio.metadata->>'payment_timing' <> 'after_service'
     or v_servicio.metadata->>'pix_after_service_authorized' <> 'true'
     or not exists (
       select 1 from private.ugo_pix_after_service_allowed_services a
       where a.service_id=p_servicio_id and a.expires_at>now()
     ) then
    raise exception 'Aprobación Pix diferida no habilitada para este TEST';
  end if;

  if coalesce(v_servicio.tarifa,0) <= 0 or v_servicio.tarifa > 2000 then
    raise exception 'Importe de prueba no válido';
  end if;
  if not exists (
    select 1 from public.evidencias_servicio e
    where e.servicio_id=p_servicio_id
      and e.usuario_id=v_servicio.proveedor_id
      and e.tipo='despues'
      and nullif(btrim(coalesce(e.storage_path,'')),'') is not null
  ) then
    raise exception 'Falta la foto final del profesional';
  end if;

  -- Any early financial record is a contract conflict: do not treat as paid
  -- and do not create/modify a payment while approving finished work.
  if exists (
    select 1 from public.pagos p
    where p.servicio_id=p_servicio_id
      and p.ambiente=v_servicio.ambiente
  ) then
    raise exception 'Existe un pago previo que requiere conciliación';
  end if;

  if nullif(v_servicio.metadata->>'trabajo_aprobado_at','') is not null then
    return v_servicio;
  end if;

  update public.servicios
  set metadata=jsonb_set(
        coalesce(metadata,'{}'::jsonb),
        '{trabajo_aprobado_at}',to_jsonb(now()::text),true),
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  -- Remains esperando_aprobacion; no received, released, completed, payout
  -- or commission mutation. Only Asaas-verified Pix can change payment state.
  return v_servicio;
end;
$$;

revoke all on function public.aprobar_trabajo_pix_diferido_test(uuid)
  from public, anon, authenticated;
grant execute on function public.aprobar_trabajo_pix_diferido_test(uuid)
  to authenticated;
comment on function public.aprobar_trabajo_pix_diferido_test(uuid) is
'Isolated TEST only: client validates finished demo work before provider creates Asaas Pix; does not record payment.';
notify pgrst,'reload schema';
