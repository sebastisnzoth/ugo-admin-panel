-- UGO TEST runtime recovery after failed physical validation.
-- Keep arrival/geofence GPS strict; dispatch may tolerate normal browser scheduling jitter.

grant select, insert, update, delete on table public.ugo_empresas_readiness to service_role;
grant select, insert, update, delete on table public.ugo_empresas_demands to service_role;
grant select, insert, update, delete on table public.ugo_empresas_slots to service_role;

do $$
declare
  v_def text;
begin
  select pg_get_functiondef('private.iniciar_matching_impl(uuid)'::regprocedure) into v_def;

  if position('v_gps_freshness constant interval := interval ''30 seconds''' in v_def)>0 then
    v_def := replace(
      v_def,
      'v_gps_freshness constant interval := interval ''30 seconds''',
      'v_gps_freshness constant interval := interval ''90 seconds'''
    );
  elsif position('v_gps_freshness constant interval := interval ''90 seconds''' in v_def)=0 then
    raise exception 'MATCHING_GPS_FRESHNESS_CONTRACT_NOT_FOUND';
  end if;

  v_def := replace(v_def,'gps_freshness_seconds=30','gps_freshness_seconds=90');
  execute v_def;
end $$;

notify pgrst,'reload schema';
