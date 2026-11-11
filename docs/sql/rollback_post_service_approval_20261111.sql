-- Manual rollback only if needed; never executed automatically.
-- New functions do not replace existing legacy payment functions.
revoke all on function public.elegir_cobro_post_servicio(uuid,text) from authenticated;
drop function if exists public.elegir_cobro_post_servicio(uuid,text);
revoke all on function public.aprobar_trabajo_sin_pago(uuid) from authenticated;
drop function if exists public.aprobar_trabajo_sin_pago(uuid);
notify pgrst,'reload schema';
