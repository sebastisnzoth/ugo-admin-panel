-- Provider opt-in: immediate offers may arrive outside calendar hours; scheduled work retains calendar checks.
-- Default false; all matching GPS, zones, debt and conflict guards remain unchanged.
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
  -- In-hours immediate requests may start now; scheduled work must fit its full duration.
  if v_target_start is null then
    if not coalesce((select case when left(btrim(coalesce(disponibilidad_horaria,'')),1)='{' then (disponibilidad_horaria::jsonb ->> 'receive24h')='true' else false end from public.perfiles_proveedor where usuario_id=p_proveedor_id), false) and not private.proveedor_horario_permite(p_proveedor_id,now(),1) then return false; end if;
  elsif not private.proveedor_horario_permite(p_proveedor_id,v_target_start,v_target_duration) then
    return false;
  end if;

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
$function$
;

