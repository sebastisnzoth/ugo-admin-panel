-- UGO TEST: restore the exact provider availability fixture after the three-debt readiness probe.
create or replace function public.provider_debt_readiness_probe()
returns jsonb
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_provider constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  v_ids uuid[];
  v_existing_real integer;
  v_blocked boolean;
  v_guard_rejected boolean := false;
  v_online boolean;
  v_disponible boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-test-provider-debt-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',0));

  select online,disponible into v_online,v_disponible
  from public.perfiles_proveedor
  where usuario_id=v_provider
  for update;
  if not found then raise exception 'TEST_PROVIDER_PROFILE_REQUIRED'; end if;

  select count(*) into v_existing_real
  from public.deudas_ugo_proveedor d
  where d.proveedor_id=v_provider
    and d.ambiente='real'
    and d.estado not in ('pagado','anulado')
    and d.saldo_pendiente>0;
  if v_existing_real<>0 then raise exception 'TEST_PROVIDER_REAL_DEBT_PRECONDITION:%',v_existing_real; end if;

  select array_agg(id order by created_at desc) into v_ids
  from (
    select id,created_at from public.deudas_ugo_proveedor
    where proveedor_id=v_provider and ambiente='demo'
      and estado='pendiente' and saldo_pendiente>0
    order by created_at desc limit 3
  ) q;
  if coalesce(array_length(v_ids,1),0)<>3 then raise exception 'TEST_PROVIDER_DEBT_FIXTURES_REQUIRED'; end if;

  update public.deudas_ugo_proveedor set ambiente='real',updated_at=now() where id=any(v_ids);
  v_blocked:=private.proveedor_bloqueado_por_deuda_ugo(v_provider);
  if not v_blocked then raise exception 'DEBT_LIMIT_DID_NOT_BLOCK'; end if;

  begin
    update public.perfiles_proveedor set online=true,disponible=true,updated_at=now() where usuario_id=v_provider;
    raise exception 'DEBT_ONLINE_GUARD_DID_NOT_REJECT';
  exception when others then
    if sqlerrm='DEBT_ONLINE_GUARD_DID_NOT_REJECT' then raise; end if;
    if sqlerrm not ilike '%comisiones UGO pendientes%' then raise; end if;
    v_guard_rejected:=true;
  end;

  update public.deudas_ugo_proveedor set ambiente='demo',updated_at=now() where id=any(v_ids);
  if private.proveedor_bloqueado_por_deuda_ugo(v_provider) then raise exception 'DEBT_FIXTURE_RESTORE_FAILED'; end if;

  update public.perfiles_proveedor set online=v_online,disponible=v_disponible,updated_at=now() where usuario_id=v_provider;
  if not exists(
    select 1 from public.perfiles_proveedor
    where usuario_id=v_provider
      and online is not distinct from v_online
      and disponible is not distinct from v_disponible
  ) then raise exception 'DEBT_PROFILE_RESTORE_FAILED'; end if;

  return jsonb_build_object(
    'status','PASS','provider_id',v_provider,'threshold',3,
    'temporary_real_debts',3,'blocked_at_threshold',v_blocked,
    'online_guard_rejected',v_guard_rejected,'fixture_restored',true,
    'profile_restored',true,'production_touched',false
  );
end
$$;
revoke all on function public.provider_debt_readiness_probe() from public,anon,authenticated;
grant execute on function public.provider_debt_readiness_probe() to service_role;
notify pgrst,'reload schema';
