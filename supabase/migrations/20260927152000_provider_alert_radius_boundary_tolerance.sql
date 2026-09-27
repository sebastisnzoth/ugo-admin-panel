-- UGO P0 · Exact 20 km boundary hardening.
-- PostGIS geography can differ by sub-centimeter floating precision at an exact boundary.
-- A 1 cm computational epsilon preserves the business rule that exactly 20,000 m is eligible.
-- Arrival geofence remains independently fixed at 200 m.

do $$
declare
  v_def text;
begin
  select pg_get_functiondef('private.iniciar_matching_impl(uuid)'::regprocedure) into v_def;
  v_def := replace(
    v_def,
    'v_alert_radius_m constant double precision := 20000;',
    E'v_alert_radius_m constant double precision := 20000;\n  v_geo_epsilon_m constant double precision := 0.01;'
  );
  v_def := replace(
    v_def,
    'extensions.st_dwithin(v_servicio.ubicacion_cliente,pp.ubicacion,v_alert_radius_m)',
    'extensions.st_dwithin(v_servicio.ubicacion_cliente,pp.ubicacion,v_alert_radius_m+v_geo_epsilon_m)'
  );
  execute v_def;

  select pg_get_functiondef('private.notify_provider_new_offer()'::regprocedure) into v_def;
  v_def := replace(
    v_def,
    'v_alert_radius_m constant double precision := 20000;',
    E'v_alert_radius_m constant double precision := 20000;\n  v_geo_epsilon_m constant double precision := 0.01;'
  );
  v_def := replace(
    v_def,
    'extensions.st_dwithin(v_client_location,v_provider_location,v_alert_radius_m)',
    'extensions.st_dwithin(v_client_location,v_provider_location,v_alert_radius_m+v_geo_epsilon_m)'
  );
  execute v_def;
end
$$;

notify pgrst,'reload schema';
