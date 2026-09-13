-- UGO TEST · provider matching readiness guard.
--
-- A provider must never appear Online/Disponible while the matching backend would
-- silently exclude that same profile. Keep the UI state and the matching contract
-- aligned at the database boundary.

create or replace function public.enforce_provider_matching_readiness()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if new.estado_verificacion <> 'verificado' then
    new.online := false;
    new.disponible := false;
    return new;
  end if;

  if coalesce(new.online,false) or coalesce(new.disponible,false) then
    if new.onboarding_completo_at is null then
      raise exception 'Completá el registro profesional antes de ponerte Online';
    end if;
    if new.termos_aceitos_at is null then
      raise exception 'Aceptá los términos de UGO antes de ponerte Online';
    end if;
    if new.categoria_principal_id is null then
      raise exception 'Elegí una categoría principal antes de ponerte Online';
    end if;
    if coalesce(new.tarifa_base,0) <= 0 then
      raise exception 'Definí una tarifa base válida antes de ponerte Online';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_provider_matching_readiness() from public;

-- Repair legacy TEST rows that could show Online while still being ineligible.
update public.perfiles_proveedor
set online=false,
    disponible=false,
    updated_at=now()
where (coalesce(online,false) or coalesce(disponible,false))
  and (
    estado_verificacion <> 'verificado'
    or onboarding_completo_at is null
    or termos_aceitos_at is null
    or categoria_principal_id is null
    or coalesce(tarifa_base,0) <= 0
  );

drop trigger if exists trg_provider_matching_readiness on public.perfiles_proveedor;
create trigger trg_provider_matching_readiness
before insert or update of online, disponible, estado_verificacion, onboarding_completo_at, termos_aceitos_at, categoria_principal_id, tarifa_base
on public.perfiles_proveedor
for each row
execute function public.enforce_provider_matching_readiness();
