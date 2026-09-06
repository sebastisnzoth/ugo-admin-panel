-- Hardening posterior a la separación DEMO/REAL.
-- Aplicada en producción el 2026-09-06.

alter function public.ugo_set_servicio_ambiente() set search_path = public, auth, pg_temp;
alter function public.ugo_set_pago_ambiente() set search_path = public, pg_temp;
alter function public.ugo_set_retiro_ambiente() set search_path = public, pg_temp;

revoke all on function public.admin_actualizar_retiro(uuid,public.retiro_estado,text,text) from public;
revoke all on function public.admin_actualizar_retiro(uuid,public.retiro_estado,text,text) from anon;
grant execute on function public.admin_actualizar_retiro(uuid,public.retiro_estado,text,text) to authenticated;
