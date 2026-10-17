-- UGO TEST: provider-selected demand zones are an ADDITIONAL matching constraint.
-- Their coordinates come from authorized aggregated demand signals, never an override of GPS.
create table if not exists public.proveedor_zonas_activas(
 proveedor_id uuid not null references public.usuarios(id) on delete cascade,
 zona text not null check(length(zona) between 2 and 100),
 lat double precision not null check(lat between -90 and 90),
 lng double precision not null check(lng between -180 and 180),
 principal boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(proveedor_id,zona)
);
create unique index if not exists proveedor_zonas_one_primary on public.proveedor_zonas_activas(proveedor_id) where principal;
create index if not exists proveedor_zonas_provider on public.proveedor_zonas_activas(proveedor_id);
alter table public.proveedor_zonas_activas enable row level security;
drop policy if exists provider_zone_self_select on public.proveedor_zonas_activas;
create policy provider_zone_self_select on public.proveedor_zonas_activas for select to authenticated using (proveedor_id=(select auth.uid()));
drop policy if exists provider_zone_self_insert on public.proveedor_zonas_activas;
create policy provider_zone_self_insert on public.proveedor_zonas_activas for insert to authenticated with check (
 proveedor_id=(select auth.uid())
);
drop policy if exists provider_zone_self_update on public.proveedor_zonas_activas;
create policy provider_zone_self_update on public.proveedor_zonas_activas for update to authenticated
 using(proveedor_id=(select auth.uid())) with check(proveedor_id=(select auth.uid()));
drop policy if exists provider_zone_self_delete on public.proveedor_zonas_activas;
create policy provider_zone_self_delete on public.proveedor_zonas_activas for delete to authenticated using(proveedor_id=(select auth.uid()));

-- A selected zone cannot extend actual GPS coverage or bypass pilot, schedule, debt or assignment limits.
create or replace function private.proveedor_zonas_permitem(p_proveedor uuid,p_servico uuid)
returns boolean language sql stable security definer set search_path='public','private','extensions','pg_temp'
as $$
 select not exists(select 1 from public.proveedor_zonas_activas z where z.proveedor_id=p_proveedor)
    or exists(
     select 1 from public.proveedor_zonas_activas z join public.servicios s on s.id=p_servico
     where z.proveedor_id=p_proveedor
      and s.ubicacion_cliente is not null
      and extensions.st_dwithin(
       s.ubicacion_cliente,
       extensions.st_setsrid(extensions.st_makepoint(z.lng,z.lat),4326)::extensions.geography,
       3000.0
      )
    );
$$;
revoke all on function private.proveedor_zonas_permitem(uuid,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.proveedor_puede_recibir_oferta(p_proveedor_id uuid, p_servicio_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_target public.servicios%rowtype;
  v_target_start timestamptz;
  v_target_end timestamptz;
  v_target_duration integer;
  v_buffer interval := interval '30 minutes';
begin
  if not private.pilot_servicio_generico_permitido(p_servicio_id) then return false; end if;
  if not private.proveedor_zonas_permitem(p_proveedor_id,p_servicio_id) then return false; end if;
  select * into v_target
  from public.servicios
  where id=p_servicio_id;

  if not found or v_target.proveedor_id is not null
     or v_target.estado not in ('borrador','buscando','ofrecido') then
    return false;
  end if;

  v_target_start := v_target.programado_para;
  v_target_duration := private.service_duration_minutes(v_target.metadata);
  v_target_end := coalesce(v_target_start,now()) + make_interval(mins=>v_target_duration);
  if not private.proveedor_horario_permite(p_proveedor_id,coalesce(v_target_start,now()),v_target_duration) then return false; end if;

  if v_target_start is not null and v_target_start < now() - interval '15 minutes' then
    return false;
  end if;

  if exists(
    select 1
    from public.servicios existing
    where existing.proveedor_id=p_proveedor_id
      and existing.id<>p_servicio_id
      and existing.estado in ('en_camino','llegado','en_progreso')
  ) then
    if v_target_start is null then return false; end if;

    if exists(
      select 1
      from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado in ('en_camino','llegado','en_progreso')
        and v_target_start < (
          case
            when existing.estado='en_progreso' and existing.iniciado_at is not null then
              greatest(
                existing.iniciado_at
                  + make_interval(mins=>private.service_duration_minutes(existing.metadata))
                  + v_buffer,
                now()+v_buffer
              )
            else
              greatest(coalesce(existing.programado_para,now()),now())
                + make_interval(mins=>private.service_duration_minutes(existing.metadata))
                + v_buffer
          end
        )
    ) then
      return false;
    end if;
  end if;

  if v_target_start is null then
    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is null
    ) then
      return false;
    end if;

    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para
              + make_interval(mins=>private.service_duration_minutes(existing.metadata))
            > now() - v_buffer
    ) then
      return false;
    end if;
  else
    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is null
    ) then
      return false;
    end if;

    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para
              + make_interval(mins=>private.service_duration_minutes(existing.metadata))
            > v_target_start - v_buffer
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$function$;
