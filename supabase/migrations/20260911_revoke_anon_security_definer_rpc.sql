-- UGO · Security hardening
-- Public SECURITY DEFINER RPCs that operate on user/admin/provider state must never be callable as anon.
-- Keep authenticated grants intact where the function itself enforces role/ownership rules.

do $$
declare
  r record;
  v_names text[] := array[
    'actualizar_ubicacion_proveedor',
    'actualizar_ubicacion_y_distancia',
    'admin_cambiar_verificacion_proveedor',
    'admin_get_auth_users',
    'admin_set_usuario_activo',
    'completar_onboarding_cliente',
    'conciliar_pix_direto',
    'crear_pago_demo_sebastian',
    'crear_pix_demo',
    'disparar_web_push_ugo',
    'enforce_provider_verification_offline',
    'guardar_perfil_cliente',
    'guardar_push_suscripcion',
    'guardar_ubicacion_servicio_cliente',
    'informar_pix_direto',
    'marcar_onboarding_proveedor_pendiente',
    'obtener_demanda_proveedor',
    'obtener_ofertas_proveedor',
    'saldo_proveedor',
    'solicitar_retiro',
    'sync_verificacion_proveedor_desde_documentos'
  ];
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = any(v_names)
  loop
    execute format('revoke execute on function %I.%I(%s) from anon', r.nspname, r.proname, r.identity_args);
  end loop;
end $$;
