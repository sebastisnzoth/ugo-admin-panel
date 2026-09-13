create or replace function public.cancelar_servicio(p_servicio_id uuid)
returns public.servicios
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select private.cancelar_servicio_impl(p_servicio_id);
$$;

revoke all on function public.cancelar_servicio(uuid) from public;
revoke all on function public.cancelar_servicio(uuid) from anon;
grant execute on function public.cancelar_servicio(uuid) to authenticated;
grant execute on function public.cancelar_servicio(uuid) to service_role;
