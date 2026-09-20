-- UGO · hardening: no exponer un RPC público innecesario para el contador de deuda.
-- La UI ya deriva el estado desde deudas_ugo_proveedor bajo RLS y los guards
-- críticos viven en triggers/private helpers.

drop function if exists public.estado_deuda_ugo_proveedor();

notify pgrst,'reload schema';
