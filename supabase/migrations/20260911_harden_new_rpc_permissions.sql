-- UGO · P0 security hardening for 2026-09-11 domains
-- Evita que SECURITY DEFINER nuevos queden ejecutables por anon/Public.

revoke execute on function public.proponer_ampliacion_servicio(uuid,text,numeric,integer) from public, anon;
revoke execute on function public.resolver_ampliacion_servicio(uuid,boolean) from public, anon;
grant execute on function public.proponer_ampliacion_servicio(uuid,text,numeric,integer) to authenticated;
grant execute on function public.resolver_ampliacion_servicio(uuid,boolean) to authenticated;

create or replace function private.vincular_evidencias_solicitud()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  update public.evidencias_solicitud
  set servicio_id=new.id,
      vinculada_at=now()
  where cliente_id=new.cliente_id
    and servicio_id is null
    and created_at >= now()-interval '24 hours';
  return new;
end;
$$;

drop trigger if exists trg_vincular_evidencias_solicitud on public.servicios;
create trigger trg_vincular_evidencias_solicitud
after insert on public.servicios
for each row execute function private.vincular_evidencias_solicitud();

drop function if exists public.vincular_evidencias_solicitud();