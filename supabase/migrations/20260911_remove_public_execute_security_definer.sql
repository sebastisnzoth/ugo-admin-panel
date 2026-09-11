-- UGO · Security hardening II
-- PostgreSQL grants EXECUTE on functions to PUBLIC by default. Revoking only `anon`
-- is not enough because anon inherits PUBLIC. Remove PUBLIC access explicitly and
-- re-grant only the authenticated API surface that is intentionally callable.

revoke execute on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) from public, anon;
revoke execute on function public.completar_onboarding_cliente(text,text,text,text,text,text,text,text,text,double precision,double precision) from public, anon;
revoke execute on function public.conciliar_pix_direto(uuid,boolean,text,text) from public, anon;
revoke execute on function public.crear_pago_demo_sebastian(uuid) from public, anon;
revoke execute on function public.guardar_ubicacion_servicio_cliente(uuid,double precision,double precision) from public, anon;
revoke execute on function public.informar_pix_direto(uuid) from public, anon;
revoke execute on function public.marcar_onboarding_proveedor_pendiente() from public, anon;
revoke execute on function public.saldo_proveedor() from public, anon;
revoke execute on function public.solicitar_retiro(numeric) from public, anon;

-- Trigger-only helpers: never part of the client RPC surface.
revoke execute on function public.disparar_web_push_ugo() from public, anon, authenticated;
revoke execute on function public.enforce_provider_verification_offline() from public, anon, authenticated;
revoke execute on function public.sync_verificacion_proveedor_desde_documentos() from public, anon, authenticated;

-- Explicit signed-in API grants. Function bodies still enforce ownership/role rules.
grant execute on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) to authenticated;
grant execute on function public.completar_onboarding_cliente(text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;
grant execute on function public.conciliar_pix_direto(uuid,boolean,text,text) to authenticated;
grant execute on function public.crear_pago_demo_sebastian(uuid) to authenticated;
grant execute on function public.guardar_ubicacion_servicio_cliente(uuid,double precision,double precision) to authenticated;
grant execute on function public.informar_pix_direto(uuid) to authenticated;
grant execute on function public.marcar_onboarding_proveedor_pendiente() to authenticated;
grant execute on function public.saldo_proveedor() to authenticated;
grant execute on function public.solicitar_retiro(numeric) to authenticated;
